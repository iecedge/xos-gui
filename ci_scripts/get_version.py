import json

with open('package.json', 'r') as f:
    print(json.load(f)['version'])
