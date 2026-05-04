"""
agente_vitae.py
Agente de consulta ao banco FormulaCerta (Firebird) para o e-commerce Pro Vitae.
Roda na porta 5001 — independente do servidor.py (porta 5000).

Endpoints:
  GET  /api/health
  GET  /api/clientes/buscar?q=<nome_ou_cpf>
  GET  /api/clientes/<cdcli>
  GET  /api/produtos/buscar?q=<texto>&grupo=<M|E|...>&setor=<000|...>
  GET  /api/produtos/<cdpro>
  GET  /api/prescritores/buscar?q=<nome_ou_crm>
  GET  /api/tabelas
  GET  /api/tabelas/<nome>/colunas
  POST /api/query   { "sql": "SELECT ...", "params": [...] }   (apenas SELECT)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import fdb
import traceback
import unicodedata
import re
import datetime
import math

app = Flask(__name__)
CORS(app)

# ── Conexão Firebird ─────────────────────────────────────────────────────────
DB_PATH     = '192.168.5.4/3050:D:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER     = 'SYSDBA'
DB_PASSWORD = 'masterkey'
DB_CHARSET  = 'WIN1252'

# Carregar biblioteca Firebird no macOS (resolve @rpath via pré-carga)
import ctypes as _ctypes
import sys as _sys
_FB_LIB_DIR = '/private/tmp/fbpayload/Versions/A/Resources/lib'
_FB_CLIENT  = f'{_FB_LIB_DIR}/libfbclient.dylib'
if _sys.platform == 'darwin':
    try:
        _ctypes.CDLL(f'{_FB_LIB_DIR}/libtommath.dylib', mode=_ctypes.RTLD_GLOBAL)
        _ctypes.CDLL(_FB_CLIENT, mode=_ctypes.RTLD_GLOBAL)
        fdb.load_api(_FB_CLIENT)
    except Exception as _e:
        print(f'[WARN] Firebird lib load: {_e}')

def get_db():
    return fdb.connect(
        dsn=DB_PATH,
        user=DB_USER,
        password=DB_PASSWORD,
        charset=DB_CHARSET,
    )

# ── Helpers ──────────────────────────────────────────────────────────────────
def serialize(v):
    """Converte tipos do Firebird para JSON-safe."""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, datetime.time):
        return v.strftime('%H:%M:%S')
    if isinstance(v, datetime.datetime):
        return v.isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    return v

def strip(v):
    return v.strip() if isinstance(v, str) else v

def _format_serier(n: int) -> str:
    """SERIER: '0'-'9' para 0-9, depois 'A','B',... para 10+"""
    return str(n) if n < 10 else chr(ord('A') + n - 10)

_BOX_DESCR = {
    91064: 'CAIXA BRANCA/PRATA 5AMP 2ML',
    91073: 'CAIXA BRANCA/PRATA 10AMP 2ML',
    91074: 'CAIXA BRANCA/PRATA 5AMP 10ML',
    85104: 'CAIXA MED. ESTEREIS CINZA PEQ.',
    89751: 'CAIXA HIDROXIAPATITA',
}
_CDPRO_FR_AMBAR_10ML = 78731  # FR AMBAR 10ML — detecta produtos de 10mL

def _buscar_formula(cursor, cdpro):
    """
    Busca a fórmula de um produto (FC05000 → FC05100).
    Retorna (is_10ml, is_kit, componentes).
    componentes = lista de dicts {tpcmp, cdpro, descr, quant, unida}
    """
    if not cdpro:
        return False, False, []
    cursor.execute("SELECT FIRST 1 CDFRM FROM FC05000 WHERE CDSAC = ?", (str(cdpro),))
    row = cursor.fetchone()
    if not row:
        return False, False, []
    cdfrm = row[0]
    cursor.execute("""
        SELECT TPCMP, CDPRO, DESCR, QUANT, UNIDA
        FROM FC05100
        WHERE CDFRM = ?
        ORDER BY ITEMID
    """, (cdfrm,))
    comps = []
    is_10ml = False
    is_kit = False
    for tpcmp_r, cdpro_c, descr_c, quant_c, unida_c in cursor.fetchall():
        t = (strip(tpcmp_r) or 'C').strip()
        if t == 'S':
            is_kit = True
        if cdpro_c == _CDPRO_FR_AMBAR_10ML:
            is_10ml = True
        comps.append({
            'tpcmp': t,
            'cdpro': cdpro_c,
            'descr': strip(descr_c) or '',
            'quant': float(quant_c or 0),
            'unida': strip(unida_c) or '',
        })
    return is_10ml, is_kit, comps

def row_to_dict(cursor, row):
    return {cursor.description[i][0]: serialize(row[i]) for i in range(len(row))}

def rows_to_list(cursor, rows):
    return [row_to_dict(cursor, r) for r in rows]

def is_cpf_input(q: str) -> bool:
    digits = re.sub(r'[\.\-/]', '', q)
    return digits.isdigit()

def only_digits(q: str) -> str:
    return re.sub(r'[\.\-/]', '', q)


# ── HEALTH ───────────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM RDB$DATABASE")
        cursor.close()
        conn.close()
        return jsonify({'status': 'ok', 'db': 'conectado', 'agent': 'agente_vitae'})
    except Exception as e:
        return jsonify({'status': 'erro', 'db': str(e)}), 500


# ── CLIENTES ─────────────────────────────────────────────────────────────────
@app.route('/api/clientes/buscar', methods=['GET', 'OPTIONS'])
def buscar_clientes():
    """
    Busca clientes no FC07000.
    ?q=<nome ou CPF/CNPJ>  (mínimo 2 caracteres)
    """
    if request.method == 'OPTIONS':
        return '', 204

    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify({'clientes': [], 'total': 0})

    try:
        conn = get_db()
        cursor = conn.cursor()

        if is_cpf_input(q):
            digits = only_digits(q)
            cursor.execute("""
                SELECT FIRST 20
                    c.CDCLI, c.NOMECLI, c.NRCNPJ, c.EMAIL, c.TPCLI,
                    c.DTNAS, c.DTCAD,
                    e.NRDDD, e.NRTEL, e.NRDDD2, e.NRTEL2,
                    e.ENDER, e.ENDNR, e.ENDCP, e.BAIRR, e.MUNIC, e.UNFED, e.NRCEP, e.OBSENTREGA
                FROM FC07000 c
                LEFT JOIN FC07200 e ON e.CDCLI = c.CDCLI AND e.OCENDER = COALESCE(c.OCENDCOR, '1')
                WHERE c.NRCNPJ STARTING WITH ?
                ORDER BY c.NOMECLI
            """, (digits,))
        else:
            cursor.execute("""
                SELECT FIRST 20
                    c.CDCLI, c.NOMECLI, c.NRCNPJ, c.EMAIL, c.TPCLI,
                    c.DTNAS, c.DTCAD,
                    e.NRDDD, e.NRTEL, e.NRDDD2, e.NRTEL2,
                    e.ENDER, e.ENDNR, e.ENDCP, e.BAIRR, e.MUNIC, e.UNFED, e.NRCEP, e.OBSENTREGA
                FROM FC07000 c
                LEFT JOIN FC07200 e ON e.CDCLI = c.CDCLI AND e.OCENDER = COALESCE(c.OCENDCOR, '1')
                WHERE UPPER(c.NOMECLI) CONTAINING UPPER(?)
                ORDER BY c.NOMECLI
            """, (q,))

        clientes = []
        for row in cursor.fetchall():
            (cdcli, nomecli, nrcnpj, email, tpcli, dtnas, dtcad,
             ddd1, tel1, ddd2, tel2,
             ender, endnr, endcp, bairr, munic, unfed, nrcep, obsent) = row
            telefone = ''
            if ddd1 and tel1:
                telefone = f'({strip(ddd1)}) {strip(tel1)}'
            elif ddd2 and tel2:
                telefone = f'({strip(ddd2)}) {strip(tel2)}'
            partes = [p for p in [
                strip(ender), strip(endnr), strip(endcp),
                strip(bairr), strip(munic), strip(unfed),
            ] if p]
            endereco = ', '.join(partes)
            if nrcep: endereco += f' — CEP {strip(nrcep)}'
            if obsent: endereco += f' ({strip(obsent)})'
            clientes.append({
                'id': cdcli,
                'formulaCode': f'FC-{cdcli:05d}',
                'nome': strip(nomecli) or '',
                'documento': strip(nrcnpj) or '',
                'email': strip(email) or '',
                'telefone': telefone,
                'tipo': 'PJ' if strip(tpcli) == '2' else 'PF',
                'nascimento': str(dtnas) if dtnas else '',
                'cadastro': str(dtcad) if dtcad else '',
                'endereco': endereco,
            })

        cursor.close()
        conn.close()
        return jsonify({'clientes': clientes, 'total': len(clientes)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'clientes': [], 'total': 0, 'erro': str(e)}), 500


@app.route('/api/clientes/<int:cdcli>', methods=['GET'])
def get_cliente(cdcli):
    """Retorna dados completos de um cliente pelo código FC."""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                c.CDCLI, c.NOMECLI, c.NRCNPJ, c.EMAIL, c.EMAIL2,
                c.TPCLI, c.DTNAS, c.DTCAD,
                e.NRDDD, e.NRTEL, e.NRDDD2, e.NRTEL2
            FROM FC07000 c
            LEFT JOIN FC07200 e ON e.CDCLI = c.CDCLI AND e.OCENDER = '1'
            WHERE c.CDCLI = ?
        """, (cdcli,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({'erro': 'Cliente não encontrado'}), 404

        cdcli, nomecli, nrcnpj, email, email2, tpcli, dtnas, dtcad, ddd1, tel1, ddd2, tel2 = row
        telefone = ''
        if ddd1 and tel1:
            telefone = f'({strip(ddd1)}) {strip(tel1)}'
        elif ddd2 and tel2:
            telefone = f'({strip(ddd2)}) {strip(tel2)}'

        return jsonify({
            'id': cdcli,
            'formulaCode': f'FC-{cdcli:05d}',
            'nome': strip(nomecli) or '',
            'documento': strip(nrcnpj) or '',
            'email': strip(email) or '',
            'email2': strip(email2) or '',
            'telefone': telefone,
            'tipo': 'PJ' if strip(tpcli) == '2' else 'PF',
            'nascimento': str(dtnas) if dtnas else '',
            'cadastro': str(dtcad) if dtcad else '',
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/api/clientes/<int:cdcli>/enderecos', methods=['GET', 'OPTIONS'])
def get_enderecos_cliente(cdcli):
    """Retorna todos os endereços cadastrados para um cliente."""
    if request.method == 'OPTIONS':
        return '', 204
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT OCENDER, ENDER, ENDNR, ENDCP, BAIRR, MUNIC, UNFED, NRCEP, OBSENTREGA
            FROM FC07200
            WHERE CDCLI = ?
            ORDER BY OCENDER
        """, (cdcli,))
        enderecos = []
        for row in cursor.fetchall():
            ocender, ender, endnr, endcp, bairr, munic, unfed, nrcep, obsent = row
            partes = [p for p in [
                strip(ender), strip(endnr), strip(endcp),
                strip(bairr), strip(munic), strip(unfed),
            ] if p]
            endereco_str = ', '.join(partes)
            if nrcep: endereco_str += f' — CEP {strip(nrcep)}'
            if obsent: endereco_str += f' ({strip(obsent)})'
            if endereco_str:
                enderecos.append({'ocender': str(ocender).strip(), 'endereco': endereco_str})
        cursor.close()
        conn.close()
        return jsonify({'enderecos': enderecos})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'enderecos': [], 'erro': str(e)}), 500


# ── PRODUTOS / ATIVOS ────────────────────────────────────────────────────────
@app.route('/api/produtos/buscar', methods=['GET', 'OPTIONS'])
def buscar_produtos():
    """
    Busca matérias-primas/produtos no FC03000.
    ?q=<texto>          — busca por nome (CONTAINING)
    ?grupo=M            — filtra por grupo (M=matéria-prima, E=embalagem, etc.)
    ?setor=000          — filtra por setor
    ?ativos_apenas=1    — default 1; use 0 para incluir inativos
    """
    if request.method == 'OPTIONS':
        return '', 204

    q             = (request.args.get('q') or '').strip()
    grupo         = (request.args.get('grupo') or '').strip()
    setor         = (request.args.get('setor') or '').strip()
    ativos_apenas = request.args.get('ativos_apenas', '1') != '0'

    if len(q) < 2:
        return jsonify({'produtos': [], 'total': 0})

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Busca por código numérico (CDPRO) ou por nome (DESCR + DESCRPRD)
        if q.isdigit():
            where  = ["CDPRO = ?"]
            params = [int(q)]
        else:
            params = []
            palavras = [p for p in q.split() if len(p) >= 2]
            word_clauses = []
            for p in palavras:
                word_clauses.append(
                    "(UPPER(DESCR) CONTAINING UPPER(?) OR UPPER(DESCRPRD) CONTAINING UPPER(?))"
                )
                params += [p, p]
            where = word_clauses if word_clauses else ["UPPER(DESCR) CONTAINING UPPER(?)"]
            if not word_clauses:
                params = [q]

        if ativos_apenas:
            where.append("SITUA = 'A'")
            where.append("INDDEL = 'N'")
        if grupo:
            where.append("GRUPO = ?")
            params.append(grupo)
        if setor:
            where.append("SETOR = ?")
            params.append(setor)

        sql = f"""
            SELECT FIRST 30
                CDPRO, DESCR, DESCRPRD, SITUA, INDDEL,
                PRVEN, PRCOM, GRUPO, SETOR, DIASVAL, CDDCI
            FROM FC03000
            WHERE {' AND '.join(where)}
            ORDER BY DESCR
        """
        cursor.execute(sql, params)

        produtos = []
        for row in cursor.fetchall():
            cdpro, descr, descrprd, situa, inddel, prven, prcom, grupo_v, setor_v, diasval, cddci = row
            preco_venda  = round((prven or 0) / 10000, 2)
            preco_compra = round((prcom or 0) / 10000, 2)
            produtos.append({
                'id': cdpro,
                'nome': strip(descr) or '',
                'nomeReduzido': strip(descrprd) or '',
                'ativo': strip(situa) == 'A',
                'deletado': strip(inddel) == 'S',
                'precoVenda': preco_venda,
                'precoCompra': preco_compra,
                'grupo': strip(grupo_v) or '',
                'setor': strip(setor_v) or '',
                'diasValidade': diasval or 0,
                'dci': strip(cddci) or '',
            })

        cursor.close()
        conn.close()
        return jsonify({'produtos': produtos, 'total': len(produtos)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'produtos': [], 'total': 0, 'erro': str(e)}), 500


@app.route('/api/produtos/<int:cdpro>', methods=['GET'])
def get_produto(cdpro):
    """Retorna dados completos de um produto/ativo pelo código."""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                CDPRO, DESCR, DESCRPRD, SITUA, INDDEL,
                PRVEN, PRCOM, GRUPO, SETOR, DIASVAL,
                CDDCI, PRINCIPIOATIVO, OBSCOMPO, DESCRDET
            FROM FC03000
            WHERE CDPRO = ?
        """, (cdpro,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({'erro': 'Produto não encontrado'}), 404

        cdpro, descr, descrprd, situa, inddel, prven, prcom, grupo, setor, diasval, cddci, principio, obscompo, descrdet = row
        return jsonify({
            'id': cdpro,
            'nome': strip(descr) or '',
            'nomeReduzido': strip(descrprd) or '',
            'ativo': strip(situa) == 'A',
            'deletado': strip(inddel) == 'S',
            'precoVenda': round((prven or 0) / 10000, 2),
            'precoCompra': round((prcom or 0) / 10000, 2),
            'grupo': strip(grupo) or '',
            'setor': strip(setor) or '',
            'diasValidade': diasval or 0,
            'dci': strip(cddci) or '',
            'principioAtivo': strip(principio) or '',
            'obsComposicao': strip(obscompo) or '',
            'descricaoDetalhada': strip(descrdet) or '',
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ── PRESCRITORES ─────────────────────────────────────────────────────────────
@app.route('/api/prescritores/buscar', methods=['GET', 'OPTIONS'])
def buscar_prescritores():
    """
    Busca médicos/prescritores no FC04000.
    ?q=<nome ou CRM>
    """
    if request.method == 'OPTIONS':
        return '', 204

    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify({'prescritores': [], 'total': 0})

    try:
        conn = get_db()
        cursor = conn.cursor()

        # Detecta se é busca por CRM (só dígitos)
        if q.isdigit():
            cursor.execute("""
                SELECT FIRST 20
                    NRCRM, NOMEMED, PFCRM, NRCRM, UFCRM
                FROM FC04000
                WHERE NRCRM STARTING WITH ?
                  AND NOMEMED IS NOT NULL
                ORDER BY NOMEMED
            """, (q,))
        else:
            cursor.execute("""
                SELECT FIRST 20
                    NRCRM, NOMEMED, PFCRM, NRCRM, UFCRM
                FROM FC04000
                WHERE UPPER(NOMEMED) CONTAINING UPPER(?)
                  AND NOMEMED IS NOT NULL
                ORDER BY NOMEMED
            """, (q,))

        prescritores = []
        for row in cursor.fetchall():
            nrcrm_id, nomemed, pfcrm, nrcrm, ufcrm = row
            nome = strip(nomemed) or ''
            conselho = strip(pfcrm) or 'CRM'
            numero = strip(nrcrm) or ''
            uf = strip(ufcrm) or ''
            prescritores.append({
                'id': numero,
                'nome': nome,
                'conselho': conselho,
                'numero': numero,
                'uf': uf,
                'especialidade': '',
                'crm': f'{conselho} {numero}/{uf}'.strip(),
            })

        cursor.close()
        conn.close()
        return jsonify({'prescritores': prescritores, 'total': len(prescritores)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'prescritores': [], 'total': 0, 'erro': str(e)}), 500


# ── EXPLORAÇÃO DE TABELAS ────────────────────────────────────────────────────
@app.route('/api/tabelas', methods=['GET'])
def listar_tabelas():
    """Lista todas as tabelas do banco FormulaCerta (FC%)."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TRIM(RDB$RELATION_NAME)
            FROM RDB$RELATIONS
            WHERE RDB$SYSTEM_FLAG = 0
              AND RDB$RELATION_NAME STARTING WITH 'FC'
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify({'tabelas': tabelas, 'total': len(tabelas)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'tabelas': [], 'erro': str(e)}), 500


@app.route('/api/tabelas/<nome>/colunas', methods=['GET'])
def listar_colunas(nome):
    """Lista colunas e tipos de uma tabela."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                TRIM(f.RDB$FIELD_NAME),
                TRIM(t.RDB$TYPE_NAME),
                f.RDB$NULL_FLAG
            FROM RDB$RELATION_FIELDS f
            LEFT JOIN RDB$TYPES t
                ON t.RDB$FIELD_NAME = 'RDB$FIELD_TYPE'
                AND t.RDB$TYPE = (
                    SELECT ff.RDB$FIELD_TYPE
                    FROM RDB$FIELDS ff
                    WHERE ff.RDB$FIELD_NAME = f.RDB$FIELD_SOURCE
                )
            WHERE f.RDB$RELATION_NAME = ?
            ORDER BY f.RDB$FIELD_POSITION
        """, (nome.upper(),))
        colunas = [
            {'nome': row[0], 'tipo': row[1] or '?', 'obrigatorio': row[2] == 1}
            for row in cursor.fetchall()
        ]
        cursor.close()
        conn.close()
        return jsonify({'tabela': nome.upper(), 'colunas': colunas, 'total': len(colunas)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'colunas': [], 'erro': str(e)}), 500


# ── QUERY LIVRE (só leitura) ─────────────────────────────────────────────────
@app.route('/api/query', methods=['POST', 'OPTIONS'])
def query_livre():
    """
    Executa qualquer SELECT no banco.
    Body: { "sql": "SELECT FIRST 10 ...", "params": [] }
    Bloqueia INSERT, UPDATE, DELETE, DROP.
    """
    if request.method == 'OPTIONS':
        return '', 204

    body = request.get_json(force=True) or {}
    sql    = (body.get('sql') or '').strip()
    params = body.get('params') or []

    if not sql:
        return jsonify({'erro': 'Campo sql obrigatório'}), 400

    sql_upper = sql.upper().lstrip()
    for proibido in ('INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'EXECUTE'):
        if sql_upper.startswith(proibido) or f' {proibido} ' in sql_upper:
            return jsonify({'erro': f'Operação {proibido} não permitida. Apenas SELECT.'}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        colunas = [d[0] for d in cursor.description] if cursor.description else []
        linhas  = [dict(zip(colunas, [strip(v) for v in row])) for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify({'colunas': colunas, 'linhas': linhas, 'total': len(linhas)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ── REQUISIÇÕES (MANIPULADOS) ────────────────────────────────────────────────
# FC12000 = cabeçalho (NRRQU, CDCLI, DTENTR, VRRQU, CDFUN)
# FC12100 = itens (NRRQU, SERIER, PRCOBR, QTFOR, PFCRM, NRCRM, UFCRM)
# Preços em FC12100 já em R$ como DOUBLE — sem divisão por 10000.
@app.route('/api/requisicoes/buscar', methods=['GET', 'OPTIONS'])
def buscar_requisicoes():
    """
    Busca requisições no FC.
    ?q=<número>      — busca pelo número exato da REQ (FC12000.NRRQU)
    ?cdcli=<código>  — busca pelo código do cliente
    """
    if request.method == 'OPTIONS':
        return '', 204

    q     = (request.args.get('q') or '').strip()
    cdcli = (request.args.get('cdcli') or '').strip()

    try:
        conn   = get_db()
        cursor = conn.cursor()

        where  = []
        params = []

        if q and q.isdigit():
            where.append('r.NRRQU = ?')
            params.append(int(q))
        elif q:
            where.append('UPPER(c.NOMECLI) CONTAINING UPPER(?)')
            params.append(q)

        if cdcli and cdcli.isdigit():
            where.append('r.CDCLI = ?')
            params.append(int(cdcli))

        if not where:
            return jsonify({'requisicoes': [], 'total': 0})

        sql = f"""
            SELECT FIRST 20
                r.NRRQU, r.CDCLI, r.DTENTR, r.VRRQU,
                c.NOMECLI, f.NOMEFUN
            FROM FC12000 r
            LEFT JOIN FC07000 c ON c.CDCLI = r.CDCLI
            LEFT JOIN FC08000 f ON f.CDFUN = r.CDFUN
            WHERE {' AND '.join(where)}
            ORDER BY r.NRRQU DESC
        """
        cursor.execute(sql, params)

        requisicoes = []
        for row in cursor.fetchall():
            nrrqu, cdcli_v, dtentr, vrrqu, nomecli, nomefun = row
            requisicoes.append({
                'nrreq':      nrrqu,
                'cdcli':      cdcli_v,
                'cliente':    strip(nomecli) or '',
                'data':       str(dtentr) if dtentr else '',
                'atendente':  strip(nomefun) or '',
                'valorTotal': round(float(vrrqu or 0), 2),
            })

        cursor.close()
        conn.close()
        return jsonify({'requisicoes': requisicoes, 'total': len(requisicoes)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'requisicoes': [], 'total': 0, 'erro': str(e)}), 500


@app.route('/api/requisicoes/<nrreq>', methods=['GET'])
def get_requisicao(nrreq):
    """
    Retorna dados completos de uma requisição pelo número.
    Cabeçalho: FC12000 | Itens: FC12100
    Preços PRCOBR já em R$ (DOUBLE) — sem divisão.
    """
    try:
        conn   = get_db()
        cursor = conn.cursor()

        # ── Cabeçalho ──
        cursor.execute("""
            SELECT FIRST 1
                r.NRRQU, r.CDCLI, r.DTENTR, r.VRRQU, r.CDFUN,
                c.NOMECLI, f.NOMEFUN
            FROM FC12000 r
            LEFT JOIN FC07000 c ON c.CDCLI = r.CDCLI
            LEFT JOIN FC08000 f ON f.CDFUN = r.CDFUN
            WHERE r.NRRQU = ?
        """, (int(nrreq),))

        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({'erro': f'Requisição {nrreq} não encontrada'}), 404

        nrrqu, cdcli, dtentr, vrrqu, cdfun, nomecli, nomefun = row

        # ── Itens (FC12100) — colunas explícitas para evitar campo TIME ──
        cursor.execute("""
            SELECT i.SERIER, i.PRCOBR, i.QTFOR,
                   i.PFCRM, i.NRCRM, i.UFCRM,
                   i.NOMEPA, i.POSOL
            FROM FC12100 i
            WHERE i.NRRQU = ?
            ORDER BY i.SERIER
        """, (int(nrreq),))
        rows_itens = cursor.fetchall()

        # ── Composição (FC12110) — apenas ativos (TPCMP='C') ──
        cursor.execute("""
            SELECT SERIER, DESCR, QUANT, UNIDA
            FROM FC12110
            WHERE NRRQU = ? AND TPCMP = 'C'
            ORDER BY SERIER, ITEMID
        """, (int(nrreq),))
        composicao = {}
        for r in cursor.fetchall():
            ser, descr, quant, unida = r
            s = (strip(ser) or '0')
            if s not in composicao:
                composicao[s] = []
            parte = strip(descr) or ''
            if quant is not None and unida:
                parte += f' {quant:g}{strip(unida)}'
            composicao[s].append(parte)

        itens = []
        for r in rows_itens:
            serier, prcobr, qtfor, pfcrm, nrcrm, ufcrm, nomepa, posol = r
            s = strip(serier) or '0'
            ingredientes = composicao.get(s, [])
            descricao = ' + '.join(ingredientes) if ingredientes else (strip(posol) or f'Fórmula {s}')
            preco = round(float(prcobr or 0), 2)
            qtd   = float(qtfor or 1)
            itens.append({
                'item':       s,
                'descricao':  descricao,
                'paciente':   strip(nomepa) or '',
                'posologia':  strip(posol) or '',
                'quantidade': qtd,
                'precoUnit':  preco,
                'subtotal':   round(preco * qtd, 2),
                'prescritor': f'{strip(pfcrm) or "CRM"} {strip(nrcrm) or ""}/{strip(ufcrm) or ""}'.strip(),
            })

        cursor.close()
        conn.close()

        return jsonify({
            'nrreq':      nrrqu,
            'cdcli':      cdcli,
            'cliente':    strip(nomecli) or '',
            'data':       str(dtentr) if dtentr else '',
            'valorTotal': round(float(vrrqu or 0), 2),
            'atendente':  strip(nomefun) or '',
            'itens':      itens,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ── ATENDENTES ───────────────────────────────────────────────────────────────
@app.route('/api/atendentes', methods=['GET', 'OPTIONS'])
def listar_atendentes():
    """Lista funcionários ativos do FC08000 para uso como atendentes."""
    if request.method == 'OPTIONS':
        return '', 204
    try:
        conn   = get_db()
        cursor = conn.cursor()
        # Apenas funcionários com login ativo (USERID preenchido)
        cursor.execute("""
            SELECT CDFUN, NOMEFUN, USERID
            FROM FC08000
            WHERE FUNATIVO = 'S'
              AND USERID IS NOT NULL
              AND TRIM(USERID) <> ''
              AND NOMEFUN IS NOT NULL
            ORDER BY NOMEFUN
        """)
        # Deduplica por CDFUN: mantém o registro com nome mais longo (mais completo)
        por_cdfun = {}
        for row in cursor.fetchall():
            cdfun, nomefun, userid = row
            nome = strip(nomefun) or ''
            uid  = strip(userid) or ''
            if not nome or nome == '.':
                continue
            existente = por_cdfun.get(cdfun)
            if existente is None or len(nome) > len(existente['nome']):
                por_cdfun[cdfun] = {'id': cdfun, 'nome': nome, 'userid': uid}

        atendentes = sorted(por_cdfun.values(), key=lambda x: x['nome'])
        cursor.close()
        conn.close()
        return jsonify({'atendentes': atendentes, 'total': len(atendentes)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'atendentes': [], 'total': 0, 'erro': str(e)}), 500


# ── COMPOSIÇÃO DE KIT / MESCLA ───────────────────────────────────────────────

_EXCIPIENTE_KW = [
    'FRASCO', 'AMBAR', 'FR AMBAR', 'AMPOLA', 'SERINGA', 'AGULHA', 'TUBO',
    'BISNAGA', 'POTE', 'GARRAFA', 'SACHE', 'ENVELOPE',
    'SELO', 'TAMPA', 'BORRACHA', 'LACRE', 'ROLHA', 'ALUMINIO',
    'EMBALAGEM', 'ROTULO', 'ETIQUETA',
    'AGUA PARA INJECAO', 'AGUA PARA INJETAVEIS', 'AGUA ESTERIL', 'AGUA DESTILADA',
    'AGUA PURIFICADA', 'SORO FISIOLOGICO', 'SOLUCAO FISIOLOGICA', 'NACL',
    'ALCOOL BENZILICO', 'ALCOOL ETILICO', 'PROPILENO GLICOL',
    'GLICERINA', 'METILPARABENO', 'PROPILPARABENO', 'NIPAGIN',
]

def _e_excipiente(nome: str) -> bool:
    n = unicodedata.normalize('NFD', (nome or '').upper())
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return any(kw in n for kw in _EXCIPIENTE_KW)


@app.route('/api/produtos/<int:cdpro>/composicao', methods=['GET', 'OPTIONS'])
def get_composicao_produto(cdpro):
    """
    Retorna ativos/componentes de um kit ou mescla pelo CDPRO.
    1) Se DESCRPRD != DESCR, usa DESCRPRD como composição (dados já cadastrados).
    2) Caso contrário, busca a fórmula em FC05000 → FC05100 e filtra excipientes.
    """
    if request.method == 'OPTIONS':
        return '', 204
    try:
        conn   = get_db()
        cursor = conn.cursor()

        # 1. Verifica se DESCRPRD já tem a composição
        cursor.execute("SELECT DESCR, DESCRPRD FROM FC03000 WHERE CDPRO = ?", (cdpro,))
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            return jsonify({'ativos': [], 'composicao': ''})

        nome, nome_red = strip(row[0]) or '', strip(row[1]) or ''
        if nome_red and nome_red.upper() != nome.upper():
            cursor.close(); conn.close()
            return jsonify({'ativos': [nome_red], 'composicao': nome_red})

        # 2. Busca fórmula em FC05000
        cursor.execute("SELECT FIRST 1 CDFRM FROM FC05000 WHERE CDSAC = ?", (str(cdpro),))
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            return jsonify({'ativos': [], 'composicao': ''})

        cdfrm = row[0]

        # 3. Componentes da fórmula (FC05100) — apenas tipo 'C' (componente)
        cursor.execute("""
            SELECT k.DESCR, k.QUANT, k.UNIDA
            FROM FC05100 k
            WHERE k.CDFRM = ? AND k.TPCMP = 'C'
            ORDER BY k.ITEMID
        """, (cdfrm,))

        ativos = []
        for r in cursor.fetchall():
            descr, quant, unida = r
            nome_comp = strip(descr) or ''
            if not nome_comp or _e_excipiente(nome_comp):
                continue
            ativos.append(nome_comp)

        cursor.close()
        conn.close()
        return jsonify({'ativos': ativos, 'composicao': ', '.join(ativos)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'ativos': [], 'composicao': '', 'erro': str(e)}), 500


@app.route('/api/orcamentos/criar', methods=['POST', 'OPTIONS'])
def criar_orcamento():
    """
    Cria um orçamento no módulo Orçamentos do FormulaCerta (FC15000/FC15100/FC15110).
    Body JSON:
      cdfil     int   (padrão 392)
      cdcli     int   (obrigatório)
      cdfun     int   (código do funcionário)
      vrtotal   float
      vrdsc     float (padrão 0)
      pfcrm     str   ('1'=CRM, '4'=CRF, etc.)
      nrcrm     int
      ufcrm     str   (ex: 'SP')
      posol     str   (posologia padrão de todos os itens)
      itens     list de:
        nomepa  str
        volume  int
        univol  str   (padrão 'AMP')
        prcobr  float
        tpforma int   (padrão 14)
        cdpro   int   (opcional — para lookup de fórmula)
        descr   str
        ativos  list[str]
    """
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json(force=True) or {}

    try:
        cdfil   = int(data.get('cdfil', 392))
        cdcli   = int(data['cdcli'])
        cdfun   = int(data.get('cdfun', 0))
        vrtotal = float(data.get('vrtotal', 0.0))
        vrdsc   = float(data.get('vrdsc', 0.0))
        pfcrm   = str(data.get('pfcrm', '1'))
        nrcrm   = int(data.get('nrcrm', 0))
        ufcrm   = str(data.get('ufcrm', 'SP'))[:2]
        posol   = str(data.get('posol', 'uso em consultório'))[:100].upper()
        itens   = data.get('itens', [])
    except (KeyError, ValueError, TypeError) as e:
        return jsonify({'erro': f'Parâmetro inválido: {e}', 'sucesso': False}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        # ── Nome do cliente ───────────────────────────────────────────────
        cursor.execute("SELECT FIRST 1 NOMECLI FROM FC07000 WHERE CDCLI = ?", (cdcli,))
        row_cli = cursor.fetchone()
        nomecli = strip(row_cli[0]) if row_cli else ''

        # ── Endereço do cliente (FC07200) ─────────────────────────────────
        cursor.execute("""
            SELECT FIRST 1 ENDER, ENDNR FROM FC07200
            WHERE CDCLI = ? ORDER BY OCENDER
        """, (cdcli,))
        row_end = cursor.fetchone()
        endepa = ''
        if row_end:
            partes = [p for p in [strip(row_end[0]), strip(row_end[1])] if p]
            endepa = ' '.join(partes)[:50]

        # ── Prescritor: se não informado, tenta pelo nome do cliente ──────
        if nrcrm == 0 and nomecli:
            primeiro_nome = nomecli.split()[0]
            cursor.execute("""
                SELECT FIRST 1 NRCRM, PFCRM, UFCRM FROM FC04000
                WHERE UPPER(NOMEMED) CONTAINING UPPER(?)
                  AND NRCRM IS NOT NULL
            """, (primeiro_nome,))
            row_med = cursor.fetchone()
            if row_med:
                nrcrm = int(row_med[0] or 0)
                pfcrm = str(row_med[1] or '1').strip()
                ufcrm = str(row_med[2] or 'SP').strip()[:2]

        # ── Próximo número pelo generator da filial (NRORC) ───────────────
        gen_name = f'GN_REQUISICAO{cdfil:04d}'
        cursor.execute(f'SELECT GEN_ID({gen_name}, 1) FROM RDB$DATABASE')
        nrorc = cursor.fetchone()[0]

        hoje = datetime.date.today()
        dtval = hoje + datetime.timedelta(days=365)  # validade 1 ano

        # ── Templates FC15100 e FC15110 (colunas inseríveis sem computadas) ─
        def _get_template(tabela):
            cursor.execute(f"""
                SELECT TRIM(rf.RDB$FIELD_NAME)
                FROM RDB$RELATION_FIELDS rf
                LEFT JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
                WHERE rf.RDB$RELATION_NAME = '{tabela}'
                  AND f.RDB$COMPUTED_BLR IS NULL
                ORDER BY rf.RDB$FIELD_POSITION
            """)
            cols = [r[0].strip() for r in cursor.fetchall()]
            col_list = ', '.join(cols)
            cursor.execute(f"SELECT FIRST 1 {col_list} FROM {tabela} WHERE CDFIL = ?", (cdfil,))
            row = cursor.fetchone()
            if row is None:
                cursor.execute(f"SELECT FIRST 1 {col_list} FROM {tabela}")
                row = cursor.fetchone()
            return cols, (dict(zip(cols, row)) if row else {})

        ins_cols_100, tmpl100 = _get_template('FC15100')
        ins_cols_110, tmpl110 = _get_template('FC15110')

        # ── Cabeçalho FC15000 ─────────────────────────────────────────────
        cursor.execute("""
            INSERT INTO FC15000 (
                CDFIL, NRORC, CDCLI, CDFILD,
                DTENTR, VRRQU, VRDSC, VRTXA,
                FLAGENV, NOMEPA, ENDEPA, NRCPMN, CDFUN
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, 0.0,
                'N', ?, ?, 0, ?
            )
        """, (cdfil, nrorc, cdcli, cdfil,
              hoje, vrtotal, vrdsc,
              nomecli[:50], endepa, cdfun or None))

        # ── Itens FC15100 + componentes FC15110 ───────────────────────────
        serieo_counter = 0
        for item in itens:
            raw_nomepa = str(item.get('nomepa', '')).strip()
            nomepa     = (raw_nomepa or nomecli)[:50]
            volume     = max(1, int(item.get('volume', 0)) or 1)
            univol     = str(item.get('univol', 'AMP'))[:3]
            prcobr     = float(item.get('prcobr', 0.0))
            tpforma    = int(item.get('tpforma', 14))
            cdpro      = item.get('cdpro')
            descr_item = str(item.get('descr', nomepa))[:50]

            is_10ml, is_kit, formula_comps = _buscar_formula(cursor, cdpro)

            if is_kit:
                box = 89751 if 'HIDROXI' in descr_item.upper() else 85104
                series_list = [(1, volume, box)]
            elif is_10ml:
                series_list = [(5, math.ceil(volume / 5), 91074)]
            elif univol == 'AMP':
                if volume <= 5:
                    series_list = [(volume, 1, 91064)]
                elif 6 <= volume <= 9:
                    series_list = [(5, 1, 91064), (volume - 5, 1, 91064)]
                elif volume == 10:
                    series_list = [(10, 1, 91073)]
                else:
                    parts = []
                    remaining = volume
                    while remaining > 0:
                        batch = min(10, remaining)
                        parts.append((batch, 1, 91073 if batch == 10 else 91064))
                        remaining -= batch
                    series_list = parts
            else:
                series_list = [(volume, 1, None)]

            total_vol_ser = sum(s[0] for s in series_list)

            for vol_ser, qtfor_ser, box_cdpro in series_list:
                serieo_str = _format_serier(serieo_counter)
                serieo_counter += 1
                prcobr_ser = round(prcobr * vol_ser / total_vol_ser, 4) if total_vol_ser > 0 else prcobr

                # ── FC15100 ────────────────────────────────────────────────
                row = dict(tmpl100)
                row.update({
                    'CDFIL':           cdfil,
                    'NRORC':           nrorc,
                    'SERIEO':          serieo_str,
                    'CDCLI':           cdcli,
                    'NOMEPA':          nomepa,
                    'ENDEPA':          endepa,
                    'PFCRM':           pfcrm,
                    'NRCRM':           nrcrm,
                    'UFCRM':           ufcrm,
                    'VOLUME':          vol_ser,
                    'UNIVOL':          univol,
                    'QTFOR':           qtfor_ser,
                    'QTCONT':          0,
                    'PRCOBR':          prcobr_ser,
                    'PRREAL':          prcobr_ser,
                    'PRCUSTO':         0.0,
                    'PRCOMPRA':        0.0,
                    'PTDSC':           0,
                    'VRDSC':           0.0,
                    'PTTXA':           0,
                    'VRTXA':           0.0,
                    'PTDSCPROG':       0,
                    'TPFORMAFARMA':    tpforma,
                    'POSOL':           posol,
                    'DTENTR':          hoje,
                    'DTCAD':           hoje,
                    'DTVAL':           dtval,
                    'DTRET':           hoje,
                    'DTPRESCR':        None,
                    'CDEMB':           box_cdpro,
                    'CDCONRE':         cdfil,
                    'CDFUNRE':         cdfun or 0,
                    'QTPRESCR':        vol_ser,
                    'VOLUMEORI':       0,
                    'GRUPOTERAP':      1,
                    'TPCAP':           '1',
                    'TPPA':            '1',
                    'FTENCHCAP':       1,
                    'FTENCHFOR':       1,
                    'FTCOMPRESSAO':    1,
                    'FTSOBRECARGA':    1,
                    'FTCOMPREXCIP':    1,
                    'INDBLISTER':      'N',
                    'INDCALCVOL':      'N',
                    'INDLIBLENTA':     'N',
                    'INDLIBLENTAINT':  'N',
                    'INDPREAPROV':     'N',
                    'INDQSP':          'N',
                    'INDREPET':        'N',
                    'INDREVENTERICO':  'N',
                    'INDUSOCONT':      'N',
                    'ID':              None,
                    'HRRET':           None,
                    'HRCAD':           None,
                    'HRLAB':           None,
                    'HRPRESCR':        None,
                    'OBSERFIC':        None,
                })
                row = {k: v for k, v in row.items() if k in ins_cols_100}
                cols100 = list(row.keys())
                cursor.execute(
                    f"INSERT INTO FC15100 ({', '.join(cols100)}) VALUES ({', '.join(['?']*len(cols100))})",
                    [row[c] for c in cols100]
                )

                # ── FC15110 ────────────────────────────────────────────────
                def _ins110(item_id, tpcmp, c_cdpro, c_descr, c_quant, c_unida):
                    r = dict(tmpl110)
                    r.update({
                        'CDFIL':        cdfil,
                        'NRORC':        nrorc,
                        'SERIEO':       serieo_str,
                        'ITEMID':       item_id,
                        'TPCMP':        tpcmp,
                        'CDPRO':        c_cdpro,
                        'CDPRIN':       c_cdpro,
                        'DESCR':        (c_descr or '')[:50],
                        'QUANT':        float(c_quant),
                        'UNIDA':        c_unida,
                        'QUANTHP':      0.0,
                        'TPFORMAFARMA': tpforma,
                        'DTENTR':       hoje,
                        'INDASSOC':     'N',
                        'INDDILUI':     'N',
                        'INDELICMP':    'N',
                        'INDVEICULO':   'N',
                        'INDQSP':       'N',
                    })
                    r = {k: v for k, v in r.items() if k in ins_cols_110}
                    c110 = list(r.keys())
                    cursor.execute(
                        f"INSERT INTO FC15110 ({', '.join(c110)}) VALUES ({', '.join(['?']*len(c110))})",
                        [r[c] for c in c110]
                    )

                if formula_comps:
                    for item_id, comp in enumerate(formula_comps, start=1):
                        t       = comp['tpcmp']
                        c_cdpro = comp['cdpro']
                        c_descr = comp['descr']
                        c_quant = comp['quant']
                        c_unida = comp['unida']
                        if t in ('C', 'S'):
                            c_quant = float(vol_ser)
                        elif t == 'R':
                            c_quant = comp['quant'] * vol_ser
                        elif t == 'E' and box_cdpro is not None:
                            c_cdpro = box_cdpro
                            c_descr = _BOX_DESCR.get(box_cdpro, comp['descr'])
                            c_quant = 2.0 if box_cdpro == 91073 else 1.0
                        elif t == 'F':
                            c_quant = 2.0 if box_cdpro == 91073 else 1.0
                        _ins110(item_id, t, c_cdpro, c_descr, c_quant, c_unida)
                else:
                    _ins110(1, 'C', cdpro, descr_item, float(vol_ser), univol)
                    if box_cdpro is not None:
                        _ins110(2, 'E', box_cdpro,
                                (_BOX_DESCR.get(box_cdpro, '') or '')[:50],
                                2.0 if box_cdpro == 91073 else 1.0, 'UN')

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'nrrqu': nrorc, 'sucesso': True})

    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        traceback.print_exc()
        cursor.close()
        conn.close()
        return jsonify({'erro': str(e), 'sucesso': False}), 500


@app.route('/api/produtos/kits_composicoes', methods=['GET', 'OPTIONS'])
def get_kits_composicoes():
    """
    Retorna todos kits/mesclas ativos com suas composições para cache no frontend.
    Inclui produtos com KIT, MESCLA, TRIO, COMPLEXO, PROTOCOLO, BLEND, POOL, BOOSTER no nome.
    """
    if request.method == 'OPTIONS':
        return '', 204
    try:
        conn   = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.CDPRO, p.DESCR, p.DESCRPRD, k.DESCR as ATIVO, k.ITEMID
            FROM FC03000 p
            LEFT JOIN FC05000 f ON CAST(p.CDPRO AS VARCHAR(10)) = f.CDSAC
            LEFT JOIN FC05100 k ON k.CDFRM = f.CDFRM AND k.TPCMP = 'C'
            WHERE p.SITUA = 'A' AND p.INDDEL = 'N'
            AND (
                UPPER(p.DESCR) CONTAINING 'KIT'      OR
                UPPER(p.DESCR) CONTAINING 'MESCLA'   OR
                UPPER(p.DESCR) CONTAINING 'TRIO'      OR
                UPPER(p.DESCR) CONTAINING 'COMPLEXO'  OR
                UPPER(p.DESCR) CONTAINING 'PROTOCOLO' OR
                UPPER(p.DESCR) CONTAINING 'BLEND'     OR
                UPPER(p.DESCR) CONTAINING 'POOL'      OR
                UPPER(p.DESCR) CONTAINING 'BOOSTER'
            )
            ORDER BY p.CDPRO, k.ITEMID
        """)

        kits = {}
        for row in cursor.fetchall():
            cdpro, descr, descrprd, ativo, itemid = row
            nome     = strip(descr)    or ''
            nome_red = strip(descrprd) or ''
            ativo_str = strip(ativo) if ativo else None

            if cdpro not in kits:
                kits[cdpro] = {'id': cdpro, 'nome': nome, 'nome_red': nome_red, 'ativos': []}

            if ativo_str and not _e_excipiente(ativo_str) and ativo_str not in kits[cdpro]['ativos']:
                kits[cdpro]['ativos'].append(ativo_str)

        resultado = []
        for kit in kits.values():
            ativos = kit['ativos']
            if not ativos:
                # Fallback: usa DESCRPRD se diferente do nome completo
                nr = kit['nome_red']
                if nr and nr.upper() != kit['nome'].upper():
                    ativos = [nr]
            if ativos:
                resultado.append({'id': kit['id'], 'nome': kit['nome'], 'ativos': ativos})

        cursor.close()
        conn.close()
        return jsonify({'kits': resultado, 'total': len(resultado)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'kits': [], 'total': 0, 'erro': str(e)}), 500


# ── START ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('=' * 55)
    print('  Agente Vitae — FormulaCerta Query Agent')
    print('  Porta: 5001')
    print('  Banco: ' + DB_PATH)
    print()
    print('  GET  /api/health')
    print('  GET  /api/clientes/buscar?q=<nome_ou_cpf>')
    print('  GET  /api/clientes/<cdcli>')
    print('  GET  /api/produtos/buscar?q=<texto>')
    print('  GET  /api/produtos/<cdpro>')
    print('  GET  /api/produtos/<cdpro>/composicao')
    print('  GET  /api/prescritores/buscar?q=<nome_ou_crm>')
    print('  GET  /api/requisicoes/buscar?q=<nrreq>')
    print('  GET  /api/requisicoes/<nrreq>')
    print('  GET  /api/atendentes')
    print('  GET  /api/tabelas')
    print('  GET  /api/tabelas/<nome>/colunas')
    print('  POST /api/query  { sql, params }')
    print('=' * 55)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
