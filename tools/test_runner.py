"""Simple test runner that loads YAML test definitions and fixtures, and
invokes a pluggable 'atom' function to validate behavior.

This is a minimal example runner — replace `atom_validate_email`, etc.
with your real implementation or hooks into the system under test.
"""
import yaml
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_yaml(path):
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


# Example stub implementations — replace with real logic

def atom_validate_email(email_address, policy=None):
    # simplistic checks for demo purposes
    if not email_address or '@' not in email_address:
        return {'is_valid': False, 'reason': 'format'}
    local, domain = email_address.split('@', 1)
    # local part length check (RFC local-part <=64)
    if len(local) > 64:
        return {'is_valid': False, 'reason': 'local_part_too_long'}
    # disposable domain policy
    if policy and policy.get('reject_disposable_domains'):
        if any(domain.endswith(d) for d in ['tempmail.test','mailinator.test','yopmail.test']):
            return {'is_valid': False, 'reason': 'disposable_domain'}
    # role account policy
    if policy and policy.get('reject_role_accounts') and local in ['admin','support','postmaster','webmaster']:
        return {'is_valid': False, 'reason': 'role_address'}
    # simulate DNS/MX failures for well-known test domains
    if domain in ['nonexistent-domain-xyz12345.test', 'no-mx-record.example.test']:
        return {'is_valid': False, 'reason': 'dns_lookup_failed'}
    return {'is_valid': True}


def atom_validate_phone(phone_number):
    if not phone_number:
        return {'is_valid': False, 'reason': 'empty'}
    import re
    s = str(phone_number).strip()
    # extract common extension patterns (ext, x, extension, #)
    ext = None
    m = re.search(r"(?:ext|x|extension|#)\s*[:\-\.]?\s*(\d+)$", s, re.IGNORECASE)
    if m:
        ext = m.group(1)
        s = s[:m.start()].strip()
    # now reject letters in the remaining phone string
    if any(c.isalpha() for c in s):
        return {'is_valid': False, 'reason': 'invalid_characters'}
    digits = ''.join(c for c in s if c.isdigit())
    if len(digits) < 7:
        return {'is_valid': False, 'reason': 'too_short'}
    # naive normalization to E.164: if starts with country code assume +
    if s.startswith('+'):
        normalized = '+' + digits
    else:
        # fallback: prefix with +1 for tests
        normalized = '+1' + digits
    out = {'is_valid': True, 'normalized': normalized}
    if ext:
        out['extension'] = ext
    return out


def atom_verify_address(addr):
    # addr is a dict with country, street, city, postal_code
    street = addr.get('street', '')
    city = addr.get('city', '')
    postal = addr.get('postal_code', '') or addr.get('postal', '')
    if not street or not city:
        return {'is_valid': False, 'reason': 'missing_fields'}
    # naive deliverability
    return {'is_deliverable': True}


def atom_check_government_id(data):
    # data includes type, country, number, expiry, mrz
    mrz = data.get('mrz')
    expiry = data.get('expiry')
    if mrz:
        return {'is_valid': True, 'mrz_parsed': True}
    if expiry:
        try:
            from datetime import datetime
            exp = datetime.fromisoformat(expiry)
            if exp.date() < datetime.now().date():
                return {'is_valid': False, 'reason': 'expired'}
        except Exception:
            pass
    # default accept if number present
    if data.get('number'):
        return {'is_valid': True}
    return {'is_valid': False, 'reason': 'invalid'}


def run_test_yaml(test_yaml_path):
    doc = load_yaml(test_yaml_path)
    tests = doc.get('tests', [])
    failures = []
    for t in tests:
        name = t.get('name')
        inp = t.get('input', {})
        policy = t.get('policy', {})
        expected = t.get('expected_output', {})

        # determine atom type by presence of fields and normalize output keys to match test expectations
        if 'email_address' in inp:
            result = atom_validate_email(inp.get('email_address'), policy=policy)
            # map internal keys to expected test schema
            norm = {}
            if 'is_valid' in result:
                norm['is_valid'] = result['is_valid']
            if 'reason' in result:
                norm['failure_reason'] = result['reason']
            if 'normalized' in result:
                norm['normalized'] = result['normalized']
            res = norm
        elif 'phone' in inp or 'phone_number' in inp:
            pn = inp.get('phone') or inp.get('phone_number')
            result = atom_validate_phone(pn)
            norm = {}
            if 'is_valid' in result:
                norm['is_valid'] = result['is_valid']
            if 'reason' in result:
                norm['failure_reason'] = result['reason']
            if 'normalized' in result:
                norm['normalized'] = result['normalized']
            if 'extension' in result:
                norm['extension'] = result['extension']
            res = norm
        elif 'address' in inp or any(k in inp for k in ['street', 'city', 'postal_code', 'postal']):
            # support nested `address` key or flat address fields in the input
            addr_obj = inp.get('address') if isinstance(inp.get('address'), dict) else inp
            result = atom_verify_address(addr_obj)
            norm = {}
            # ensure is_deliverable is always present in normalized output
            norm['is_deliverable'] = result.get('is_deliverable', result.get('is_valid', False))
            if 'reason' in result:
                norm['failure_reason'] = result['reason']
            res = norm
        elif 'government_id' in inp or 'id' in inp or 'number' in inp:
            key = None
            if 'government_id' in inp:
                key = inp.get('government_id')
            else:
                key = inp
            result = atom_check_government_id(key)
            norm = {}
            if 'is_valid' in result:
                norm['is_valid'] = result['is_valid']
            if 'reason' in result:
                norm['failure_reason'] = result['reason']
            if 'mrz_parsed' in result:
                norm['mrz_parsed'] = result['mrz_parsed']
            res = norm
        else:
            res = {'is_valid': False, 'failure_reason': 'unknown_test'}
        # compare expected
        ok = True
        for k,v in expected.items():
            if res.get(k) != v:
                ok = False
                break
        if not ok:
            failures.append({'test': name, 'expected': expected, 'actual': res})
    return failures


if __name__ == '__main__':
    tests_dir = ROOT / 'tests' / 'atoms'
    yaml_tests = list(tests_dir.glob('*-extended.test.yml'))
    total_fail = []
    for y in yaml_tests:
        print('Running', y.name)
        fails = run_test_yaml(y)
        if fails:
            print(' FAILS:', len(fails))
            for f in fails:
                print('  -', f)
        else:
            print(' OK')
        total_fail.extend(fails)
    print('\nSummary: total failures =', len(total_fail))
    if total_fail:
        raise SystemExit(1)
    else:
        print('All extended tests passed (according to stubs).')
