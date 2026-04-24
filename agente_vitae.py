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

app = Flask(__name__)
CORS(app)

# ── Conexão Firebird ─────────────────────────────────────────────────────────
DB_PATH     = '192.168.5.4/3050:D:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER     = 'SYSDBA'
DB_PASSWORD = 'masterkey'
DB_CHARSET  = 'WIN1252'

def get_db():
    return fdb.connect(
        dsn=DB_PATH,
        user=DB_USER,
        password=DB_PASSWORD,
        charset=DB_CHARSET,
    )

# ── Helpers ──────────────────────────────────────────────────────────────────
def strip(v):
    return v.strip() if isinstance(v, str) else v

def row_to_dict(cursor, row):
    return {cursor.description[i][0]: strip(row[i]) for i in range(len(row))}

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
                    e.NRDDD, e.NRTEL, e.NRDDD2, e.NRTEL2
                FROM FC07000 c
                LEFT JOIN FC07200 e ON e.CDCLI = c.CDCLI AND e.OCENDER = '1'
                WHERE c.NRCNPJ STARTING WITH ?
                ORDER BY c.NOMECLI
            """, (digits,))
        else:
            cursor.execute("""
                SELECT FIRST 20
                    c.CDCLI, c.NOMECLI, c.NRCNPJ, c.EMAIL, c.TPCLI,
                    c.DTNAS, c.DTCAD,
                    e.NRDDD, e.NRTEL, e.NRDDD2, e.NRTEL2
                FROM FC07000 c
                LEFT JOIN FC07200 e ON e.CDCLI = c.CDCLI AND e.OCENDER = '1'
                WHERE UPPER(c.NOMECLI) CONTAINING UPPER(?)
                ORDER BY c.NOMECLI
            """, (q,))

        clientes = []
        for row in cursor.fetchall():
            cdcli, nomecli, nrcnpj, email, tpcli, dtnas, dtcad, ddd1, tel1, ddd2, tel2 = row
            telefone = ''
            if ddd1 and tel1:
                telefone = f'({strip(ddd1)}) {strip(tel1)}'
            elif ddd2 and tel2:
                telefone = f'({strip(ddd2)}) {strip(tel2)}'
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

        where = ["UPPER(DESCR) CONTAINING UPPER(?)"]
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
                    CDPRF, NMPRF, PFCRM, NRCRM, UFCRM, ESPECIAL
                FROM FC04000
                WHERE NRCRM STARTING WITH ?
                ORDER BY NMPRF
            """, (q,))
        else:
            cursor.execute("""
                SELECT FIRST 20
                    CDPRF, NMPRF, PFCRM, NRCRM, UFCRM, ESPECIAL
                FROM FC04000
                WHERE UPPER(NMPRF) CONTAINING UPPER(?)
                ORDER BY NMPRF
            """, (q,))

        prescritores = []
        for row in cursor.fetchall():
            cdprf, nmprf, pfcrm, nrcrm, ufcrm, especial = row
            prescritores.append({
                'id': cdprf,
                'nome': strip(nmprf) or '',
                'conselho': strip(pfcrm) or 'CRM',
                'numero': strip(nrcrm) or '',
                'uf': strip(ufcrm) or '',
                'especialidade': strip(especial) or '',
                'crm': f'{strip(pfcrm) or "CRM"} {strip(nrcrm) or ""}/{strip(ufcrm) or ""}'.strip(),
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
#
# ATENÇÃO: os nomes das tabelas abaixo (FC01000, FC01100) são suposições
# baseadas na convenção do FormulaCerta. Se retornar erro 500, use
# GET /api/tabelas para listar as tabelas reais e ajuste aqui.
#
@app.route('/api/requisicoes/buscar', methods=['GET', 'OPTIONS'])
def buscar_requisicoes():
    """
    Busca requisições no FC.
    ?q=<número>      — busca pelo número exato da REQ
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
            where.append('r.NRREQ = ?')
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
                r.NRREQ, r.CDCLI, r.DTREQ, r.SITUA, c.NOMECLI
            FROM FC01000 r
            LEFT JOIN FC07000 c ON c.CDCLI = r.CDCLI
            WHERE {' AND '.join(where)}
            ORDER BY r.NRREQ DESC
        """
        cursor.execute(sql, params)

        requisicoes = []
        for row in cursor.fetchall():
            nrreq, cdcli_v, dtreq, situa, nomecli = row
            requisicoes.append({
                'nrreq':    nrreq,
                'cdcli':    cdcli_v,
                'cliente':  strip(nomecli) or '',
                'data':     str(dtreq) if dtreq else '',
                'situacao': strip(situa) or '',
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
    Cabeçalho: FC01000 | Itens: FC01100

    Campos de preço (VLVEND, VLSUB) são divididos por 10000 para chegar ao R$.
    Se os valores saírem errados, verificar o divisor — pode ser 100 ou 1.
    """
    try:
        conn   = get_db()
        cursor = conn.cursor()

        # ── Cabeçalho ──
        cursor.execute("""
            SELECT FIRST 1
                r.NRREQ, r.CDCLI, r.DTREQ, r.SITUA,
                c.NOMECLI, r.NRATEND
            FROM FC01000 r
            LEFT JOIN FC07000 c ON c.CDCLI = r.CDCLI
            WHERE r.NRREQ = ?
        """, (int(nrreq),))

        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({'erro': f'Requisição {nrreq} não encontrada'}), 404

        nrreq_v, cdcli, dtreq, situa, nomecli, nratend = row

        # ── Itens ──
        cursor.execute("""
            SELECT
                i.NRITEM, i.CDPRO, i.DESCR,
                i.QTPRD, i.VLVEND, i.VLSUB
            FROM FC01100 i
            WHERE i.NRREQ = ?
            ORDER BY i.NRITEM
        """, (int(nrreq),))

        itens = []
        for r in cursor.fetchall():
            nritem, cdpro, descr, qtprd, vlvend, vlsub = r
            itens.append({
                'item':       nritem,
                'cdpro':      cdpro,
                'descricao':  strip(descr) or '',
                'quantidade': float(qtprd or 0),
                'precoUnit':  round(float(vlvend or 0) / 10000, 2),
                'subtotal':   round(float(vlsub or 0) / 10000, 2),
            })

        cursor.close()
        conn.close()

        return jsonify({
            'nrreq':     nrreq_v,
            'cdcli':     cdcli,
            'cliente':   strip(nomecli) or '',
            'data':      str(dtreq) if dtreq else '',
            'situacao':  strip(situa) or '',
            'atendente': strip(nratend) or '',
            'itens':     itens,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


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
    print('  GET  /api/prescritores/buscar?q=<nome_ou_crm>')
    print('  GET  /api/requisicoes/buscar?q=<nrreq>')
    print('  GET  /api/requisicoes/<nrreq>')
    print('  GET  /api/tabelas')
    print('  GET  /api/tabelas/<nome>/colunas')
    print('  POST /api/query  { sql, params }')
    print('=' * 55)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
