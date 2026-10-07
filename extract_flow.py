"""Exporta textos e percursos dos diagramas v4; apenas biblioteca padrão."""
import html
import argparse
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GROUPS = [
    (1, ['a1']), (1, ['a2', 'a3', 'a4', 'a5']),
    (2, ['b3']), (2, ['b4']), (2, ['a6', 'a7', 'a8']), (2, ['b6']),
    (3, ['b7', 'a9', 'a10', 'a11']), (4, ['b8', 'a12', 'a13', 'a14']), (4, ['b9']),
]


def plain(value):
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    return html.unescape(re.sub(r'<[^>]+>', '', value)).replace('\xa0', ' ')


def extract(source_root=ROOT):
    cells = {}
    for phases in ['fases1-2', 'fases3-4']:
        path = source_root / 'images' / f'msgX_msgGX_flow_SBSEG_v4_{phases}.drawio'
        cells.update({c.get('id'): c for c in ET.parse(path).iter('mxCell')
                      if c.get('id', '').startswith(('a', 'b'))})
    result = []
    for phase, ids in GROUPS:
        text, routes = [], []
        for id_ in ids:
            c = cells[id_]
            value = plain(c.get('value', ''))
            text.append(value)
            if c.get('edge') == '1':
                points = {p.get('as'): round((float(p.get('x')) - 120) / 300)
                          for p in c.findall('./mxGeometry/mxPoint')}
                routes.append({'from': points['sourcePoint'], 'to': points['targetPoint'],
                               'label': value.split('\n')[0]})
        result.append({'phase': phase, 'sourceIds': ids, 'formula': '\n\n'.join(text), 'routes': routes})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=ROOT,
                        help='Diretório do projeto de origem que contém images/')
    args = parser.parse_args()
    target = Path(__file__).resolve().parent / 'flow-data.js'
    target.write_text('// Gerado por extract_flow.py a partir dos diagramas v4.\n'
                      + 'const FLOW = ' + json.dumps(extract(args.source_root), ensure_ascii=False, indent=2) + ';\n')
