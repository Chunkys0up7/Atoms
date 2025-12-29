#!/usr/bin/env python3
import subprocess,sys

def run(cmd):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode(errors='replace')
    except subprocess.CalledProcessError as e:
        out = e.output.decode(errors='replace')
    print('>$', ' '.join(cmd))
    print(out)

print('Inspecting git repository...')
run(['git','status','--porcelain'])
run(['git','ls-files','atoms'])
run(['git','log','--oneline','-n','20','--','atoms'])
run(['git','remote','-v'])
