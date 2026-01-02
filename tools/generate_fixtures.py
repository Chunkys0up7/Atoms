#!/usr/bin/env python3
"""Generate expanded test fixture files for email/phone/address/gov-id.
Writes files to `test_data/fixtures/generated/`.
Usage: python tools/generate_fixtures.py --count 200
"""
import os
import argparse
import random
from datetime import datetime

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test_data', 'fixtures', 'generated')
os.makedirs(OUT_DIR, exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument('--count', type=int, default=200, help='Number of variants to generate per type')
args = parser.parse_args()
count = args.count

random.seed(42)

# Email generation
def gen_emails(n):
    domains = ['example.com','bank.com','company.co.uk','enterprise.org','mail.company.io','tempmail.test','sub.mail.example.com']
    locals = ['alice','bob.jones','oliver','maria.garcia','support','user','test.user','longlocalpart_' + 'a'*20]
    res_valid = []
    res_invalid = []
    for i in range(n):
        u = random.choice(locals)
        d = random.choice(domains)
        if random.random() < 0.85:
            # valid
            plus = ('' if random.random()<0.7 else f'+{random.choice(["x","sales","test"]) }')
            local = u + plus
            if random.random() < 0.05:
                # case variation
                local = local.upper()
            email = f"{local}@{d}"
            res_valid.append(email)
        else:
            # invalid
            kind = random.choice(['missing_at','double_at','bad_chars','long_local','empty'])
            if kind=='missing_at':
                res_invalid.append(f"{u}{d}")
            elif kind=='double_at':
                res_invalid.append(f"{u}@@{d}")
            elif kind=='bad_chars':
                res_invalid.append(f"bad!#{u}@{d}")
            elif kind=='long_local':
                res_invalid.append('l'*(310) + '@example.com')
            else:
                res_invalid.append('')
    # dedupe and trim
    return sorted(set(res_valid))[:n], sorted(set(res_invalid))[:max(1,n//10)]

# Phone generation
def gen_phones(n):
    country_codes = ['+1','+44','+49','+91','+55','+33','+63','+81','+86']
    res_valid=[]
    res_invalid=[]
    for i in range(n):
        cc = random.choice(country_codes)
        number = ''.join(str(random.randint(0,9)) for _ in range(random.choice([9,10,10,11,12])))
        if random.random() < 0.9:
            fmt = random.choice(['{cc}{num}','{cc}-{num}','({cc}){num}','{cc} {num}'])
            val = fmt.format(cc=cc, num=number)
            if random.random()<0.1:
                val = val + ' ext ' + str(random.randint(1,999))
            res_valid.append(val)
        else:
            res_invalid.append(random.choice(['12345','+99abc123','', '000000000000000000']))
    return sorted(set(res_valid))[:n], sorted(set(res_invalid))[:max(1,n//10)]

# Address generation
streets = ['Cedar Lane','Oak Ave','Pine Rd','Maple St','High Street','Bahnhofstrasse','Avenida Paulista','MG Road','Rue de Rivoli']
cities = ['Rivertown','Lakeview','Springfield','London','Berlin','Tokyo','Sao Paulo','Bengaluru','Paris']

def gen_addresses(n):
    val=[]
    inv=[]
    for i in range(n):
        country = random.choice(['US','UK','DE','JP','BR','IN','FR','RU'])
        street = f"{random.randint(1,9999)} {random.choice(streets)}"
        city = random.choice(cities)
        postal = ''.join(str(random.randint(0,9)) for _ in range(5))
        if random.random()<0.9:
            val.append({'country':country,'street':street,'city':city,'postal_code':postal})
        else:
            inv.append({'country':country,'street':'','city':'','postal_code':''})
    return val[:n], inv[:max(1,n//10)]

# Gov-id generation
names = ['SMITH, JOHN','LEE, JORDAN','GARCIA, RILEY','ZHANG, SAN','DUPONT, MARIE']

def gen_gov_ids(n):
    val=[]
    inv=[]
    for i in range(n):
        typ = random.choice(['passport','drivers_license','national_id'])
        country = random.choice(['US','GB','IN','CN','FR'])
        number = ''.join(random.choice('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') for _ in range(random.choice([7,8,9,10])))
        name = random.choice(names)
        dob = f"{random.randint(1950,2000)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        expiry = f"{random.randint(2026,2040)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        if random.random()<0.92:
            entry = {'type':typ,'country':country,'number':number,'name':name,'dob':dob,'expiry':expiry}
            val.append(entry)
        else:
            inv.append({'type':typ,'country':country,'number':'','name':name,'dob':'','expiry':expiry})
    return val[:n], inv[:max(1,n//10)]

# Write helpers

def write_yaml(path, data):
    try:
        import yaml
        with open(path,'w',encoding='utf-8') as f:
            yaml.safe_dump(data,f,allow_unicode=True,sort_keys=False)
    except Exception:
        # simple manual writer for lists/dicts
        with open(path,'w',encoding='utf-8') as f:
            def write_val(v, indent=0):
                pad = '  '*indent
                if isinstance(v, dict):
                    for k,v2 in v.items():
                        if isinstance(v2,(dict,list)):
                            f.write(f"{pad}{k}:\n")
                            write_val(v2, indent+1)
                        else:
                            f.write(f"{pad}{k}: {v2}\n")
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item,(dict,list)):
                            f.write(f"{pad}-\n")
                            write_val(item, indent+1)
                        else:
                            f.write(f"{pad}- {item}\n")
                else:
                    f.write(str(v)+"\n")
            write_val(data)

# Generate and write
print('Generating fixtures with count=', count)

emails_valid, emails_invalid = gen_emails(count)
phones_valid, phones_invalid = gen_phones(count)
addresses_valid, addresses_invalid = gen_addresses(count)
gov_valid, gov_invalid = gen_gov_ids(count)

email_out = {
    'generated_at': datetime.utcnow().isoformat(),
    'valid_emails': emails_valid,
    'invalid_emails': emails_invalid,
    'disposable_domains': ['tempmail.test','mailinator.test','yopmail.test']
}
write_yaml(os.path.join(OUT_DIR,'email-generated.yml'), email_out)

phone_out = {
    'generated_at': datetime.utcnow().isoformat(),
    'valid_numbers': phones_valid,
    'invalid_numbers': phones_invalid
}
write_yaml(os.path.join(OUT_DIR,'phone-generated.yml'), phone_out)

address_out = {
    'generated_at': datetime.utcnow().isoformat(),
    'valid_addresses': addresses_valid,
    'invalid_addresses': addresses_invalid
}
write_yaml(os.path.join(OUT_DIR,'address-generated.yml'), address_out)

gov_out = {
    'generated_at': datetime.utcnow().isoformat(),
    'valid_ids': gov_valid,
    'invalid_ids': gov_invalid
}
write_yaml(os.path.join(OUT_DIR,'gov-id-generated.yml'), gov_out)

print('Wrote generated fixtures to', OUT_DIR)
print('Counts:', 'emails',len(emails_valid), len(emails_invalid), 'phones',len(phones_valid), len(phones_invalid))
print('addresses',len(addresses_valid),len(addresses_invalid),'gov',len(gov_valid),len(gov_invalid))
