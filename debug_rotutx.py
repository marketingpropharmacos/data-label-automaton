"""
Script de Debug para ROTUTX - Formula Certa
Analisa o conteudo do campo ROTUTX e valida se e PPLA/PPLB
Gera arquivos .prn para teste manual de impressao

Uso:
  python debug_rotutx.py
  python debug_rotutx.py 90198
"""

import fdb
import base64
import sys
import os

# ========================================
# CONFIGURACAO DO BANCO FIREBIRD
# ========================================
DB_DSN  = '192.168.5.4/3050:D:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER = 'SYSDBA'
DB_PASS = 'masterkey'

# ========================================
# FUNCAO: Conectar no Firebird
# ========================================
def conectar_firebird():
    try:
        con = fdb.connect(
            dsn=DB_DSN,
            user=DB_USER,
            password=DB_PASS,
            charset='WIN1252'
        )
        print("[OK] Conectado no Firebird!")
        return con
    except Exception as e:
        print(f"[ERRO] Erro ao conectar: {e}")
        sys.exit(1)

# ========================================
# FUNCAO: Detectar colunas da FC12300
# ========================================
def detectar_colunas(cursor):
    cursor.execute("""
        SELECT TRIM(RDB$FIELD_NAME)
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'FC12300'
    """)
    colunas = {r[0].upper() for r in cursor.fetchall()}
    print(f"[INFO] Colunas FC12300: {sorted(colunas)}")
    return colunas

# ========================================
# FUNCAO: Buscar ROTUTX
# ========================================
def buscar_rotutx(req, item=1, serie=1, filial=1):
    con = conectar_firebird()
    cursor = con.cursor()

    colunas = detectar_colunas(cursor)

    where = ["NRRQU = ?", "CDFIL = ?"]
    params = [int(req), int(filial)]

    # Item
    for c in ("NRITE", "NRITEM", "NRIT", "NR_ITEM"):
        if c in colunas:
            where.append(f"{c} = ?")
            params.append(int(item))
            break

    # Serie
    for c in ("SERIER", "SERIE", "SERIERQ", "SERIERQU"):
        if c in colunas:
            where.append(f"{c} = ?")
            params.append(int(serie))
            break

    sql = "SELECT FIRST 1 ROTUTX FROM FC12300 WHERE " + " AND ".join(where) + " ORDER BY 1 DESC"
    print(f"[SQL] {sql}")
    print(f"[PARAMS] {params}")

    cursor.execute(sql, tuple(params))
    resultado = cursor.fetchone()

    if not resultado or not resultado[0]:
        print(f"[ERRO] ROTUTX nao encontrado para REQ={req}, ITEM={item}, SERIE={serie}")
        # Tentar sem serie
        print("[INFO] Tentando sem filtro de serie...")
        where2 = ["NRRQU = ?", "CDFIL = ?"]
        params2 = [int(req), int(filial)]
        for c in ("NRITE", "NRITEM", "NRIT", "NR_ITEM"):
            if c in colunas:
                where2.append(f"{c} = ?")
                params2.append(int(item))
                break
        sql2 = "SELECT FIRST 1 ROTUTX FROM FC12300 WHERE " + " AND ".join(where2) + " ORDER BY 1 DESC"
        cursor.execute(sql2, tuple(params2))
        resultado = cursor.fetchone()
        if not resultado or not resultado[0]:
            print(f"[ERRO] ROTUTX definitivamente nao encontrado")
            cursor.close()
            con.close()
            return None

    blob = resultado[0]
    if hasattr(blob, 'read'):
        rotutx_bytes = blob.read()
    elif isinstance(blob, (bytes, bytearray)):
        rotutx_bytes = bytes(blob)
    elif isinstance(blob, str):
        rotutx_bytes = blob.encode('latin-1', errors='replace')
    else:
        rotutx_bytes = None

    cursor.close()
    con.close()

    if rotutx_bytes:
        print(f"[OK] ROTUTX encontrado! Tamanho: {len(rotutx_bytes)} bytes")
    return rotutx_bytes

# ========================================
# FUNCAO: Analisar ROTUTX
# ========================================
def analisar_rotutx(rotutx_bytes):
    print("\n" + "="*60)
    print("ANALISE DO ROTUTX")
    print("="*60)

    # 1. Informacoes basicas
    print(f"\nTamanho total: {len(rotutx_bytes)} bytes")

    # 2. Primeiros 200 bytes (HEX)
    print(f"\nPrimeiros 200 bytes (HEX):")
    print(rotutx_bytes[:200].hex(' '))

    # 3. Primeiros 300 bytes (Texto)
    print(f"\nPrimeiros 300 bytes (Texto):")
    try:
        texto = rotutx_bytes[:300].decode('latin-1', errors='ignore')
        print(repr(texto))
    except:
        print("[ERRO] Nao e texto legivel")

    # 4. Verificar formato
    print(f"\nVerificacao de formato:")

    # PPLA
    comandos_ppla = [b'^w', b'^h', b'^Q', b'^S', b'^HT', b'^A', b'^FD', b'^B', b'^E']
    ppla_encontrados = []
    for cmd in comandos_ppla:
        if cmd in rotutx_bytes or cmd.upper() in rotutx_bytes:
            ppla_encontrados.append(cmd.decode('ascii'))

    # PPLB
    tem_stx_l = b'\x02L' in rotutx_bytes or b'\x02l' in rotutx_bytes
    tem_pplb_e = False
    stripped = rotutx_bytes.strip()
    if stripped.endswith(b'E') or stripped.endswith(b'\rE'):
        tem_pplb_e = True

    if ppla_encontrados:
        print(f"[OK] PARECE SER PPLA! Comandos encontrados: {', '.join(ppla_encontrados)}")
    elif tem_stx_l:
        print(f"[OK] PARECE SER PPLB! STX+L detectado")
    else:
        print("[AVISO] NAO parece ser PPLA nem PPLB")

        # Verificar outros formatos
        if b'~' in rotutx_bytes[:50]:
            print("[AVISO] Pode ser ZPL (Zebra)")
        if b'\x1b' in rotutx_bytes[:20] or b'\x1b@' in rotutx_bytes[:20]:
            print("[AVISO] Pode ser ESC/POS")

    # 5. Verificar final
    print(f"\nVerificacao do final:")
    ultimos_50 = rotutx_bytes[-50:].decode('latin-1', errors='ignore')
    print(f"Ultimos 50 bytes: {repr(ultimos_50)}")

    if rotutx_bytes.strip().endswith(b'^E'):
        print("[OK] Termina com ^E (comando de print PPLA)")
    elif tem_pplb_e and tem_stx_l:
        print("[OK] Termina com E (comando de print PPLB)")
    else:
        print("[AVISO] NAO termina com ^E nem E - PRECISA ADICIONAR!")

    # 6. Verificar encoding
    print(f"\nEncoding:")
    try:
        rotutx_bytes.decode('ascii')
        print("[OK] E ASCII puro")
    except:
        non_ascii = sum(1 for b in rotutx_bytes if b > 127)
        print(f"[INFO] Contem {non_ascii} caracteres nao-ASCII (acentuacao provavel)")

    # 7. Verificar quebras de linha
    print(f"\nQuebras de linha:")
    crlf = rotutx_bytes.count(b'\r\n')
    lf = rotutx_bytes.count(b'\n') - crlf
    cr = rotutx_bytes.count(b'\r') - crlf
    stx = rotutx_bytes.count(b'\x02')

    print(f"  CRLF (\\r\\n): {crlf}")
    print(f"  LF (\\n): {lf}")
    print(f"  CR (\\r): {cr}")
    print(f"  STX (0x02): {stx}")

    if cr > 0 and lf == 0 and crlf == 0:
        print("[OK] Usa CR puro - correto para PPLB Argox!")
    elif crlf > 0:
        print("[INFO] Usa Windows (\\r\\n)")
    elif lf > 0:
        print("[INFO] Usa Unix (\\n)")

    # 8. Listar todas as linhas
    print(f"\nConteudo linha a linha:")
    try:
        texto_completo = rotutx_bytes.decode('latin-1', errors='replace')
        # Tenta separar por CR, LF ou CRLF
        linhas = texto_completo.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        for i, linha in enumerate(linhas[:50]):
            display = linha.replace('\x02', '<STX>').replace('\x03', '<ETX>')
            print(f"  [{i:03d}] {display}")
    except Exception as e:
        print(f"[ERRO] Nao foi possivel listar linhas: {e}")

# ========================================
# FUNCAO: Salvar para analise
# ========================================
def salvar_arquivo(rotutx_bytes, req):
    output_dir = os.path.dirname(os.path.abspath(__file__))

    filename = os.path.join(output_dir, f'rotutx_req_{req}.prn')
    with open(filename, 'wb') as f:
        f.write(rotutx_bytes)
    print(f"\nArquivo original salvo: {filename}")

    # Tambem salva com ^E adicionado (PPLA)
    filename_ppla = os.path.join(output_dir, f'rotutx_req_{req}_COM_E_PPLA.prn')
    rotutx_ppla = rotutx_bytes.strip() + b'\r\n^E\r\n'
    with open(filename_ppla, 'wb') as f:
        f.write(rotutx_ppla)
    print(f"Arquivo com ^E (PPLA) salvo: {filename_ppla}")

    # Salva com E (PPLB)
    filename_pplb = os.path.join(output_dir, f'rotutx_req_{req}_COM_E_PPLB.prn')
    rotutx_pplb = rotutx_bytes.strip() + b'\rE\r'
    with open(filename_pplb, 'wb') as f:
        f.write(rotutx_pplb)
    print(f"Arquivo com E (PPLB) salvo: {filename_pplb}")

# ========================================
# FUNCAO: Gerar comando de impressao
# ========================================
def gerar_comando_impressao(req):
    print(f"\nPara testar impressao manual, execute no CMD:")
    print(f"  copy /b rotutx_req_{req}.prn \"\\\\localhost\\AMP PEQUENO\"")
    print(f"  copy /b rotutx_req_{req}_COM_E_PPLA.prn \"\\\\localhost\\AMP PEQUENO\"")
    print(f"  copy /b rotutx_req_{req}_COM_E_PPLB.prn \"\\\\localhost\\AMP PEQUENO\"")

# ========================================
# FUNCAO: Gerar payload para API
# ========================================
def gerar_payload_api(rotutx_bytes):
    # Adiciona ^E se faltar
    dados = rotutx_bytes
    if not rotutx_bytes.strip().endswith(b'^E') and not rotutx_bytes.strip().endswith(b'E'):
        dados = rotutx_bytes.strip() + b'\r\n^E\r\n'

    rotutx_b64 = base64.b64encode(dados).decode('utf-8')

    print("\nPayload para API (JSON):")
    print("{")
    print(f'  "impressora": "AMP PEQUENO",')
    print(f'  "raw_base64": "{rotutx_b64[:80]}..."')
    print("}")
    print(f"\nTamanho do base64: {len(rotutx_b64)} caracteres")
    print(f"\nPara enviar via curl:")
    print(f'  curl -X POST http://localhost:5000/api/imprimir_fc \\')
    print(f'    -H "Content-Type: application/json" \\')
    print(f'    -d \'{{"req": NUMERO, "item": 1, "impressora": "AMP PEQUENO"}}\'')

    return rotutx_b64

# ========================================
# FUNCAO: Verificar FC12B00 (fila de impressao)
# ========================================
def verificar_fila(req=None):
    print(f"\n{'='*60}")
    print("FILA DE IMPRESSAO (FC12B00)")
    print("="*60)

    con = conectar_firebird()
    cursor = con.cursor()

    try:
        # Detectar colunas
        cursor.execute("""
            SELECT TRIM(RDB$FIELD_NAME)
            FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = 'FC12B00'
        """)
        colunas = [r[0] for r in cursor.fetchall()]
        print(f"Colunas FC12B00: {colunas}")

        # Buscar registros pendentes
        if req:
            cursor.execute("SELECT FIRST 10 * FROM FC12B00 WHERE NRRQU = ? ORDER BY 1 DESC", (int(req),))
        else:
            cursor.execute("SELECT FIRST 10 * FROM FC12B00 ORDER BY 1 DESC")

        rows = cursor.fetchall()
        print(f"Registros encontrados: {len(rows)}")
        for i, row in enumerate(rows):
            print(f"  [{i}] {row}")

    except Exception as e:
        print(f"[ERRO] {e}")
    finally:
        cursor.close()
        con.close()

# ========================================
# FUNCAO: Verificar FC90100 (config hardware)
# ========================================
def verificar_config_hardware():
    print(f"\n{'='*60}")
    print("CONFIGURACAO DE HARDWARE (FC90100)")
    print("="*60)

    con = conectar_firebird()
    cursor = con.cursor()

    try:
        cursor.execute("""
            SELECT TRIM(RDB$FIELD_NAME)
            FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = 'FC90100'
        """)
        colunas = [r[0] for r in cursor.fetchall()]
        print(f"Colunas FC90100: {colunas}")

        cursor.execute("SELECT FIRST 20 * FROM FC90100")
        rows = cursor.fetchall()
        print(f"Registros encontrados: {len(rows)}")
        for i, row in enumerate(rows):
            print(f"  [{i}] {row}")

    except Exception as e:
        print(f"[ERRO] {e}")
    finally:
        cursor.close()
        con.close()

# ========================================
# MAIN
# ========================================
if __name__ == '__main__':
    print("="*60)
    print("DEBUG ROTUTX - Formula Certa + Argox")
    print("="*60)

    # Solicita REQ
    if len(sys.argv) > 1:
        req = int(sys.argv[1])
    else:
        req = int(input("\nDigite o numero da requisicao (REQNUM): "))

    # Item (padrao 1)
    item_input = input("Digite o NRITE/NRITEM (padrao 1): ").strip()
    item = int(item_input) if item_input else 1

    # Serie (padrao 1)
    serie_input = input("Digite o SERIER/SERIE (padrao 1): ").strip()
    serie = int(serie_input) if serie_input else 1

    # Filial (padrao 1)
    filial_input = input("Digite o CDFIL/filial (padrao 1): ").strip()
    filial = int(filial_input) if filial_input else 1

    # Busca ROTUTX
    rotutx_bytes = buscar_rotutx(req, item=item, serie=serie, filial=filial)

    if rotutx_bytes:
        # Analisa
        analisar_rotutx(rotutx_bytes)

        # Salva arquivos
        salvar_arquivo(rotutx_bytes, req)

        # Gera comando
        gerar_comando_impressao(req)

        # Gera payload
        gerar_payload_api(rotutx_bytes)

        # Verifica fila
        verificar_fila(req)

        # Verifica config hardware
        verificar_config_hardware()

        print("\n" + "="*60)
        print("[OK] Analise completa!")
        print("="*60)

        print("\nPROXIMOS PASSOS:")
        print("1. Veja os arquivos .prn salvos")
        print("2. Teste impressao manual: copy /b rotutx_req_XXXXX.prn \"\\\\localhost\\AMP PEQUENO\"")
        print("3. Se imprimiu -> problema resolvido!")
        print("4. Se NAO imprimiu -> verifique driver (RAW datatype, Advanced Features OFF)")
        print("5. Use /api/imprimir_fc para testar via API")
    else:
        print("\n[AVISO] Verificando fila de impressao...")
        verificar_fila(req)
        verificar_config_hardware()
