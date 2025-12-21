from pathlib import Path

print('File:', Path(__file__).resolve())
print('Parent:', Path(__file__).parent)
print('Parent.parent:', Path(__file__).parent.parent)
print('Parent.parent.parent:', Path(__file__).parent.parent.parent)
print('Atoms path:', Path(__file__).parent.parent.parent / 'atoms')
print('Atoms exists:', (Path(__file__).parent.parent.parent / 'atoms').exists())
