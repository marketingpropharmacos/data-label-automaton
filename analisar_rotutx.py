"""
Analisa os ultimos 100 ROTUTX da filial 392 (FC12300)
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

    print("Buscando ultimos 100 registros com ROTUTX da filial 392...")
    cur.execute("""
        SELECT FIRST 100
            NRRQU, CDFIL, SERIER, ROTULOID, QTLIN, QTCOL, TPMODELO, DTENTR, ROTUTX
        FROM FC12300
        WHERE ROTUTX IS NOT NULL
          AND CDFIL = 392
        ORDER BY DTENTR DESC, NRRQU DESC
    """)

    rows = cur.fetchall()
    print(f"Encontrados: {len(rows)} registros na filial 392\n")

    if not rows:
        print("Nenhum registro encontrado para filial 392.")
        print("Tentando sem filtro de filial, ordenado por data...")
        cur.execute("""
            SELECT FIRST 20
                NRRQU, CDFIL, SERIER, ROTULOID, QTLIN, QTCOL, TPMODELO, DTENTR, ROTUTX
            FROM FC12300
            WHERE ROTUTX IS NOT NULL
            ORDER BY DTENTR DESC, NRRQU DESC
        """)
        rows = cur.fetchall()
        print(f"Encontrados: {len(rows)} registros (todas filiais)\n")

    # Agrupa por ROTULOID
    por_layout = defaultdict(list)
    for nrrqu, cdfil, serier, rotuloid, qtlin, qtcol, tpmodelo, dtentr, rotutx_blob in rows:
        ppla = decode_rotutx(rotutx_blob)
        if ppla:
            por_layout[str(rotuloid).strip() if rotuloid else 'NULL'].append({
                'req': nrrqu, 'filial': cdfil, 'serie': serier,
                'qtlin': qtlin, 'qtcol': qtcol, 'tpmodelo': tpmodelo,
                'dtentr': dtentr, 'ppla': ppla,
            })

    print("=" * 60)
    print(f"ROTULOID encontrados: {sorted(por_layout.keys())}")
    print("=" * 60)

    for rotuloid, registros in sorted(por_layout.items()):
        print(f"\n{'='*60}")
        print(f"ROTULOID: '{rotuloid}'  ({len(registros)} registros)")
        r0 = registros[0]
        print(f"  REQ={r0['req']}  FILIAL={r0['filial']}  SERIE={r0['serie']}  DATA={r0['dtentr']}")
        print(f"  QTLIN={r0['qtlin']}  QTCOL={r0['qtcol']}  TPMODELO={r0['tpmodelo']}")
        print(f"{'='*60}")

        setup = extrair_setup(r0['ppla'])
        print(f"  Setup:")
        for s in setup:
            print(f"    {repr(s)}")

        campos = extrair_campos(r0['ppla'])
        print(f"\n  Campos:")
        for c in campos:
            print(f"    font={c['font']} wmult={c['wmult']} hmult={c['hmult']} "
                  f"y={c['y']:>7} x={c['x']:>4}  '{c['texto']}'")

        todas_fonts = set()
        todos_y = set()
        todos_x = set()
        for r in registros:
            for c in extrair_campos(r['ppla']):
                todas_fonts.add(c['font'])
                todos_y.add(c['y'])
                todos_x.add(c['x'])

        print(f"\n  Padroes em {len(registros)} registros:")
        print(f"    Fonts:    {sorted(todas_fonts)}")
        print(f"    Y unicos: {sorted(todos_y)}")
        print(f"    X unicos: {sorted(todos_x)}")

        print(f"\n  PPLA RAW (primeiros 800 chars):")
        print(f"    {repr(r0['ppla'][:800])}")

    conn.close()
    print("\nAnalise concluida.")

if __name__ == '__main__':
    analisar()
