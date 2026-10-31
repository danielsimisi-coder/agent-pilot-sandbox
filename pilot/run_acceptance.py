#!/usr/bin/env python3
import hashlib
from pathlib import Path
import re
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
CRITERIA = '6cea33264564eed96aeabf185661e1fbdef412f3'
IMAGE = 'node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c'
PATHS = ['pilot/criteria/PLAN.md', 'pilot/criteria/PLAN-REVIEW.md', 'pilot/criteria/acceptance.test.mjs']

def snapshot():
    result = {}
    for name in PATHS:
        path = ROOT / name
        expected = subprocess.check_output(['git', 'show', f'{CRITERIA}:{name}'], cwd=ROOT)
        if path.is_symlink() or path.read_bytes() != expected:
            raise RuntimeError(f'frozen criterion changed: {name}')
        result[name] = hashlib.sha256(expected).hexdigest()
    return result

before = snapshot()
for directory in ['src', 'test']:
    if (ROOT / directory).is_symlink() or any(p.is_symlink() for p in (ROOT / directory).rglob('*')):
        raise RuntimeError('symlink in code/test input')
name = 'slug-pilot-' + uuid.uuid4().hex
with tempfile.TemporaryDirectory(prefix='slug-criteria-') as temp:
    criteria = Path(temp)
    criteria.chmod(0o755)
    (criteria / 'acceptance.test.mjs').write_bytes(subprocess.check_output(
        ['git', 'show', f'{CRITERIA}:pilot/criteria/acceptance.test.mjs'], cwd=ROOT))
    cmd = ['docker', 'run', '--rm', '--name', name, '--network', 'none', '--read-only',
           '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '64',
           '--memory', '256m', '--cpus', '1', '--user', '65534:65534',
           '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--workdir', '/workspace']
    for source, target in [(ROOT/'src', '/workspace/src'), (ROOT/'test', '/workspace/test'), (criteria, '/criteria')]:
        cmd += ['--mount', f'type=bind,src={source},dst={target},readonly']
    cmd += [IMAGE, 'node', '--test', '--test-isolation=none', '--test-reporter=tap',
            '/workspace/test/acceptance.test.mjs', '/criteria/acceptance.test.mjs']
    try:
        run = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=90)
    except subprocess.TimeoutExpired:
        subprocess.run(['docker', 'rm', '-f', name], capture_output=True)
        raise RuntimeError('acceptance timeout')
    finally:
        if snapshot() != before:
            raise RuntimeError('authority changed during execution')
    print(run.stdout, end='')
    print(run.stderr, end='')
    # Reject early exit(0). Deliberate fabrication of full TAP is outside this proof.
    required = [r'^# tests 18$', r'^# pass 18$', r'^# fail 0$']
    if run.returncode or not all(re.search(p, run.stdout, re.MULTILINE) for p in required):
        raise SystemExit('FAIL: exit status or expected acceptance count')
print('PASS: 18 tests; frozen criteria unchanged; read-only/no-network container')
