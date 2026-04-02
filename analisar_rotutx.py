"""
Analisa os ultimos 100 ROTUTX do banco Firebird (FC12300)
e extrai padroes comuns por tipo de layout (ROTULOID).

Uso: python analisar_rotutx.py
"""

import fdb
import re
from collections import defaultdict

DB_PATH     = '192.168.5.4/3050:D:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER     = 'SYSDBA'
DB_PASSWORD = 'masterkey'

def get_conn():
    return fdb.connect(dsn=DB_PATH, user=DB_USER, password=DB_PASSWORD)

def decode_rotutx(blob_data):
    if blob_data is None:
        return None
    if isinstance(blob_data, (bytes, bytearray)):
        try:
            return blob_data.decode('cp1252')
        except Exception:
            return blob_data.decode('latin-1', errors='replace')
    return str(blob_data)

def extrair_setup(ppla):
    linhas = ppla.replace('\r\n', '\r').split('\r')
    setup = []
    for linha in linhas:
        linha = linha.strip('\x02').strip()
        if not linha:
            continue
        if re.match(r'^[01]\d{10,}', linha):
            break
        setup.append(linha)
    return setup

def extrair_campos(ppla):
    linhas = ppla.replace('\r\n', '\r').split('\r')
    campos = []
    for linha in linhas:
        linha_clean = linha.strip('\x02').strip()
        # Formato dots: R(1)F(1)W(1)H(1)YYYYYYY(7)XXXX(4)texto
        m = re.match(r'^([01])(\d)(\d)(\d)(\d{7})(\d{4})(.+)$', linha_clean)
        if m:
            campos.append({
                'rot': m.group(1), 'font': m.group(2),
                'wmult': m.group(3), 'hmult': m.group(4),
                'y': int(m.group(5)), 'x': int(m.group(6)),
                'texto': m.group(7)[:50],
            })
            continue
        # Formato mm: R(1)F(1)W(1)H(1)YYYY(4)XXXX(4)texto
        m2 = re.match(r'^([01])(\d)(\d)(\d)(\d{4})(\d{4})(.+)$', linha_clean)
        if m2:
            campos.append({
                'rot': m2.group(1), 'font': m2.group(2),
                'wmult': m2.group(3), 'hmult': m2.group(4),
                'y': int(m2.group(5)), 'x': int(m2.group(6)),
                'texto': m2.group(7)[:50], 'modo': 'mm'
            })
    return campos

def analisar():
    print("Conectando ao banco Firebird...")
    conn = get_conn()
    cur = conn.cursor()

    # Colunas FC12300: CDFIL, NRRQU, SERIER, DTENTR, FLAGENV, TPDEFROT,
    #                  ROTULOID, QTLIN, QTCOL, ROTUTX, ROTUTXORI, ROTUTXMSK, TPMODELO
    print("Buscando ultimos 100 registros com ROTUTX preenchido...")
    cur.execute("""
        SELECT FIRST 100
            NRRQU, CDFIL, SERIER, ROTULOID, QTLIN, QTCOL, TPMODELO, ROTUTX
        FROM FC12300
        WHERE ROTUTX IS NOT NULL
        ORDER BY NRRQU DESC
    """)

    rows = cur.fetchall()
    print(f"Encontrados: {len(rows)} registros\n")

    # Agrupa por ROTULOID
    por_layout = defaultdict(list)
    for nrrqu, cdfil, serier, rotuloid, qtlin, qtcol, tpmodelo, rotutx_blob in rows:
        ppla = decode_rotutx(rotutx_blob)
        if ppla:
            por_layout[str(rotuloid).strip() if rotuloid else 'NULL'].append({
                'req': nrrqu, 'filial': cdfil, 'serie': serier,
                'qtlin': qtlin, 'qtcol': qtcol, 'tpmodelo': tpmodelo,
                'ppla': ppla,
            })

    print("=" * 60)
    print(f"ROTULOID encontrados: {sorted(por_layout.keys())}")
    print("=" * 60)

    for rotuloid, registros in sorted(por_layout.items()):
        print(f"\n{'='*60}")
        print(f"ROTULOID: '{rotuloid}'  ({len(registros)} registros)")
        r0 = registros[0]
        print(f"  QTLIN={r0['qtlin']}  QTCOL={r0['qtcol']}  TPMODELO={r0['tpmodelo']}")
        print(f"{'='*60}")

        # Setup
        setup = extrair_setup(r0['ppla'])
        print(f"  Setup (req {r0['req']}):")
        for s in setup:
            print(f"    {repr(s)}")

        # Campos do primeiro exemplo
        campos = extrair_campos(r0['ppla'])
        print(f"\n  Campos (req {r0['req']} serie {r0['serie']}):")
        for c in campos:
            print(f"    font={c['font']} wmult={c['wmult']} hmult={c['hmult']} "
                  f"y={c['y']:>7} x={c['x']:>4}  '{c['texto']}'")

        # Padroes comuns entre todos os registros
        todas_fonts = set()
        todos_y = set()
        todos_x = set()
        for r in registros:
            for c in extrair_campos(r['ppla']):
                todas_fonts.add(c['font'])
                todos_y.add(c['y'])
                todos_x.add(c['x'])

        print(f"\n  Padroes em {len(registros)} registros:")
        print(f"    Fonts:      {sorted(todas_fonts)}")
        print(f"    Y unicos:   {sorted(todos_y)}")
        print(f"    X unicos:   {sorted(todos_x)}")

        # PPLA raw
        print(f"\n  PPLA RAW (primeiros 600 chars):")
        print(f"    {repr(r0['ppla'][:600])}")

    conn.close()
    print("\nAnalise concluida.")

if __name__ == '__main__':
    analisar()
