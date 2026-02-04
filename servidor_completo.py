from flask import Flask, jsonify, request
from flask_cors import CORS
import fdb
import platform

# Importa win32print apenas no Windows
if platform.system() == 'Windows':
    try:
        import win32print
        import win32ui
        PRINTING_AVAILABLE = True
    except ImportError:
        print("AVISO: pywin32 não instalado. Execute: pip install pywin32")
        PRINTING_AVAILABLE = False
else:
    PRINTING_AVAILABLE = False
    print("AVISO: Sistema não-Windows detectado. Impressão desabilitada.")

app = Flask(__name__)
CORS(app)

DB_PATH = '192.168.6.46/3050:C:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER = 'SYSDBA'
DB_PASSWORD = 'masterkey'

def get_db_connection():
    return fdb.connect(
        dsn=DB_PATH,
        user=DB_USER,
        password=DB_PASSWORD,
        charset='WIN1252'
    )

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@app.route('/api/tabelas', methods=['GET'])
def listar_tabelas():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabelas": tabelas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/colunas/<tabela>', methods=['GET'])
def listar_colunas(tabela):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = ?
            ORDER BY RF.RDB$FIELD_POSITION
        """, (tabela.upper(),))
        colunas = [{
            "nome": row[0].strip(),
            "tipo": row[1],
            "tamanho": row[2]
        } for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabela": tabela, "colunas": colunas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca tabelas relacionadas a observações
@app.route('/api/debug/tabelas-obs', methods=['GET'])
def debug_tabelas_obs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE '%OBS%' 
                 OR RDB$RELATION_NAME LIKE '%FIC%'
                 OR RDB$RELATION_NAME LIKE '%033%'
                 OR RDB$RELATION_NAME LIKE '%ROT%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabelas": tabelas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca observações de ficha em tabelas alternativas
@app.route('/api/debug/obs-ficha/<cdpro>', methods=['GET'])
def debug_obs_ficha(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultados = {}
        
        # Tenta FC03310
        try:
            cursor.execute("""
                SELECT * FROM FC03310 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC03310"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC03310"] = {"erro": str(e)}
        
        # Tenta FC03320
        try:
            cursor.execute("""
                SELECT * FROM FC03320 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC03320"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC03320"] = {"erro": str(e)}
        
        # Tenta FC06300
        try:
            cursor.execute("""
                SELECT * FROM FC06300 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC06300"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC06300"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "resultados": resultados
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca texto específico em TODAS tabelas (corrigido)
@app.route('/api/debug/buscar-texto', methods=['GET'])
def debug_buscar_texto():
    texto = request.args.get('texto', '')
    if not texto:
        return jsonify({"success": False, "error": "Parâmetro 'texto' é obrigatório"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todas as tabelas do usuário
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        encontrados = []
        erros = []
        
        for tabela in tabelas:
            try:
                # Busca colunas VARCHAR (tipo 37) ou BLOB (tipo 261)
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (F.RDB$FIELD_TYPE = 261 OR (F.RDB$FIELD_TYPE = 37 AND F.RDB$FIELD_LENGTH > 20))
                """, (tabela,))
                
                colunas_info = [(row[0].strip(), row[1]) for row in cursor.fetchall()]
                
                for coluna, tipo in colunas_info:
                    try:
                        # Para VARCHAR usa LIKE direto, para BLOB precisa de CAST
                        if tipo == 37:  # VARCHAR
                            sql = f"SELECT FIRST 3 * FROM {tabela} WHERE UPPER({coluna}) LIKE UPPER('%{texto}%')"
                        else:  # BLOB
                            sql = f"SELECT FIRST 3 * FROM {tabela} WHERE UPPER(CAST({coluna} AS VARCHAR(2000))) LIKE UPPER('%{texto}%')"
                        
                        cursor.execute(sql)
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            for row in rows:
                                registro = {}
                                for i, col in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'read'):
                                        try:
                                            val = val.read().decode('latin-1')[:300]
                                        except:
                                            val = "[BLOB]"
                                    elif hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif val is not None:
                                        val = str(val)[:300]
                                    registro[col] = val
                                encontrados.append({
                                    "tabela": tabela,
                                    "coluna": coluna,
                                    "tipo": "BLOB" if tipo == 261 else "VARCHAR",
                                    "registro": registro
                                })
                    except Exception as e:
                        pass  # Ignora erros de colunas individuais
            except Exception as e:
                erros.append(f"{tabela}: {str(e)}")
        
        conn.close()
        return jsonify({
            "success": True,
            "texto": texto,
            "totalTabelas": len(tabelas),
            "totalEncontrados": len(encontrados),
            "encontrados": encontrados,
            "erros": erros if erros else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: estrutura completa da FC03300
@app.route('/api/debug/estrutura-fc03300', methods=['GET'])
def debug_estrutura_fc03300():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = 'FC03300'
            ORDER BY RF.RDB$FIELD_POSITION
        """)
        colunas = [{
            "nome": row[0].strip(),
            "tipo": row[1],
            "tamanho": row[2]
        } for row in cursor.fetchall()]
        
        cursor.execute("SELECT FIRST 1 * FROM FC03300 WHERE CDPRO = 3348")
        exemplo = None
        if cursor.description:
            cols = [desc[0].strip() for desc in cursor.description]
            row = cursor.fetchone()
            if row:
                exemplo = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')[:100]
                    exemplo[col] = str(val) if val is not None else None
        
        conn.close()
        return jsonify({
            "success": True,
            "colunas": colunas,
            "exemplo": exemplo
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: lista últimas requisições
@app.route('/api/debug/ultimas-requisicoes', methods=['GET'])
def debug_ultimas_requisicoes():
    limite = request.args.get('limite', '20')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            SELECT FIRST {limite} NRRQU, CDFIL, NOMEPA, DTCAD, TPFORMAFARMA
            FROM FC12100
            ORDER BY NRRQU DESC
        """)
        requisicoes = []
        for row in cursor.fetchall():
            requisicoes.append({
                "nrRequisicao": str(row[0]),
                "filial": str(row[1]),
                "paciente": row[2],
                "dataCad": row[3].strftime('%d/%m/%Y') if row[3] else None,
                "tipoFormaFarma": row[4]
            })
        conn.close()
        return jsonify({"success": True, "requisicoes": requisicoes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: lista produtos com observações
@app.route('/api/debug/produtos-com-observacoes', methods=['GET'])
def debug_produtos_com_observacoes():
    limite = request.args.get('limite', '20')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            SELECT FIRST {limite} O.CDPRO, O.TPFORMAFARMA, O.CDICP, O.GRICP, P.DESCR, O.OBSER 
            FROM FC03300 O
            LEFT JOIN FC03000 P ON O.CDPRO = P.CDPRO
            WHERE O.OBSER IS NOT NULL
            ORDER BY O.CDPRO, O.GRICP, O.CDICP
        """)
        produtos = []
        for row in cursor.fetchall():
            obser = row[5]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            if obser and obser.strip():
                produtos.append({
                    "cdpro": row[0],
                    "tipoFormaFarma": row[1],
                    "codigoObs": row[2],
                    "gricp": row[3],
                    "descricao": row[4],
                    "observacoes": obser[:300] if obser else None
                })
        conn.close()
        return jsonify({"success": True, "total": len(produtos), "produtos": produtos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/formulas/<nr_requisicao>', methods=['GET'])
def debug_formulas(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        colunas = [desc[0].strip() for desc in cursor.description]
        registros = []
        for row in cursor.fetchall():
            registro = {}
            for i, col in enumerate(colunas):
                val = row[i]
                if hasattr(val, 'strftime'):
                    val = val.strftime('%d/%m/%Y')
                registro[col] = str(val) if val is not None else None
            registros.append(registro)
        conn.close()
        return jsonify({
            "success": True,
            "colunas": colunas,
            "total_registros": len(registros),
            "registros": registros
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/produtos-requisicao/<nr_requisicao>', methods=['GET'])
def debug_produtos_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT ITEMID, CDPRO, DESCR, QUANT, UNIDA, TPCMP
            FROM FC12110
            WHERE NRRQU = ? AND CDFIL = ?
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        produtos = []
        for row in cursor.fetchall():
            produtos.append({
                "itemId": row[0],
                "cdpro": row[1],
                "descricao": row[2],
                "quantidade": str(row[3]) if row[3] else None,
                "unidade": row[4],
                "tipoCmp": row[5]
            })
        conn.close()
        return jsonify({"success": True, "produtos": produtos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: FC12110 completo - mostra TODOS os campos para descobrir campo de ordenação
@app.route('/api/debug/fc12110-completo/<nr_requisicao>', methods=['GET'])
def debug_fc12110_completo(nr_requisicao):
    """
    Endpoint para investigar campos de ordenação da FC12110.
    Retorna TODOS os campos da tabela para identificar qual campo
    corresponde à ordem visual das 'barras' no FórmulaCerta.
    """
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM FC12110 
            WHERE NRRQU = ? AND CDFIL = ? AND TPCMP IN ('C', 'S')
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        
        colunas = [desc[0].strip() for desc in cursor.description]
        itens = []
        for row in cursor.fetchall():
            item = {}
            for i, col in enumerate(colunas):
                val = row[i]
                if hasattr(val, 'read'):
                    try:
                        val = val.read().decode('latin-1')[:200]
                    except:
                        val = "[BLOB]"
                elif hasattr(val, 'strftime'):
                    val = val.strftime('%d/%m/%Y %H:%M:%S')
                item[col] = str(val) if val is not None else None
            itens.append(item)
        
        conn.close()
        return jsonify({
            "success": True,
            "requisicao": nr_requisicao,
            "filial": filial,
            "totalColunas": len(colunas),
            "totalItens": len(itens),
            "colunas": colunas,
            "itens": itens
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: observações por CDPRO com GRICP
@app.route('/api/debug/observacoes/<cdpro>', methods=['GET'])
def debug_observacoes(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT CDPRO, TPFORMAFARMA, CDICP, GRICP, OBSER 
            FROM FC03300 
            WHERE CDPRO = ?
            ORDER BY GRICP, CDICP
        """, (cdpro,))
        
        observacoes = []
        for row in cursor.fetchall():
            obser = row[4]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            observacoes.append({
                "cdpro": row[0],
                "tipoFormaFarma": row[1],
                "codigoObs": row[2],
                "gricp": row[3],
                "observacoes": obser
            })
        
        conn.close()
        
        if not observacoes:
            return jsonify({"success": False, "error": "Produto não encontrado na FC03300"}), 404
        
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "totalObservacoes": len(observacoes),
            "observacoes": observacoes
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: dados da FC99999 por CDPRO (OBSFIC)
@app.route('/api/debug/fc99999/<cdpro>', methods=['GET'])
def debug_fc99999(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        argumento_obsfic = f"OBSFIC{cdpro}"
        cursor.execute("""
            SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
            FROM FC99999 
            WHERE ARGUMENTO = ?
            ORDER BY SUBARGUM
        """, (argumento_obsfic,))
        
        registros = []
        for row in cursor.fetchall():
            texto = row[2]
            if texto and hasattr(texto, 'read'):
                texto = texto.read().decode('latin-1')
            registros.append({
                "argumento": row[0],
                "subargum": row[1],
                "parametro": texto
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "argumento_buscado": argumento_obsfic,
            "total": len(registros),
            "registros": registros
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/observacoes-requisicao/<nr_requisicao>', methods=['GET'])
def debug_observacoes_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT TPFORMAFARMA FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        req_row = cursor.fetchone()
        tipo_forma = req_row[0] if req_row else None
        
        cursor.execute("""
            SELECT I.ITEMID, I.CDPRO, I.DESCR, I.TPCMP, O.OBSER, O.GRICP, O.CDICP
            FROM FC12110 I
            LEFT JOIN FC03300 O ON I.CDPRO = O.CDPRO
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID, O.GRICP, O.CDICP
        """, (nr_requisicao, filial))
        
        produtos = []
        for row in cursor.fetchall():
            obser = row[4]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            
            produtos.append({
                "itemId": row[0],
                "cdpro": row[1],
                "descricao": row[2],
                "tipoCmp": row[3],
                "observacoes": obser,
                "gricp": row[5],
                "codigoObs": row[6]
            })
        
        conn.close()
        return jsonify({
            "success": True, 
            "tipoFormaFarmaRequisicao": tipo_forma,
            "produtos": produtos
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: verifica observações de produtos de uma requisição com detalhes
@app.route('/api/debug/verificar-obs-requisicao/<nr_requisicao>', methods=['GET'])
def debug_verificar_obs_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca TPFORMAFARMA da requisição
        cursor.execute("""
            SELECT TPFORMAFARMA FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        req_row = cursor.fetchone()
        tipo_forma_requisicao = req_row[0] if req_row else None
        
        # Busca produtos da requisição
        cursor.execute("""
            SELECT I.ITEMID, I.CDPRO, I.DESCR
            FROM FC12110 I
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID
        """, (nr_requisicao, filial))
        
        itens = cursor.fetchall()
        
        resultado = {
            "tipoFormaFarmaRequisicao": tipo_forma_requisicao,
            "produtos": []
        }
        
        for item in itens:
            cdpro = item[1]
            
            # Busca TODAS as observações deste produto (sem filtro de TPFORMAFARMA)
            cursor.execute("""
                SELECT TPFORMAFARMA, CDICP, OBSER 
                FROM FC03300 
                WHERE CDPRO = ?
                ORDER BY TPFORMAFARMA, CDICP
            """, (cdpro,))
            
            obs_list = []
            for obs in cursor.fetchall():
                texto = obs[2]
                if texto and hasattr(texto, 'read'):
                    texto = texto.read().decode('latin-1')
                obs_list.append({
                    "tpFormaFarma": obs[0],
                    "cdicp": obs[1],
                    "texto": texto[:200] if texto else None
                })
            
            resultado["produtos"].append({
                "cdpro": cdpro,
                "descricao": item[2],
                "totalObservacoes": len(obs_list),
                "observacoes": obs_list
            })
        
        conn.close()
        return jsonify({"success": True, **resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# DEBUG: INVESTIGAÇÃO DE KITS E FÓRMULAS
# ============================================

# Debug: busca tabelas relacionadas a Fórmulas/Kits/Componentes
@app.route('/api/debug/tabelas-formula', methods=['GET'])
def debug_tabelas_formula():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca tabelas que possam conter fórmulas, kits ou componentes
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE '%FORM%' 
                 OR RDB$RELATION_NAME LIKE '%FRM%'
                 OR RDB$RELATION_NAME LIKE '%KIT%'
                 OR RDB$RELATION_NAME LIKE '%COMP%'
                 OR RDB$RELATION_NAME LIKE '%ITEM%'
                 OR RDB$RELATION_NAME LIKE '%037%'
                 OR RDB$RELATION_NAME LIKE '%038%'
                 OR RDB$RELATION_NAME LIKE '%039%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        # Lista estrutura de cada tabela encontrada
        resultado = []
        for tabela in tabelas:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                FROM RDB$RELATION_FIELDS RF
                JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                WHERE RF.RDB$RELATION_NAME = ?
                ORDER BY RF.RDB$FIELD_POSITION
            """, (tabela,))
            colunas = [{
                "nome": row[0].strip(),
                "tipo": row[1],
                "tamanho": row[2]
            } for row in cursor.fetchall()]
            
            # Conta registros
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
            except:
                total = "?"
            
            resultado.append({
                "tabela": tabela,
                "colunas": colunas,
                "totalRegistros": total
            })
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca código de fórmula/kit em todas as tabelas
@app.route('/api/debug/buscar-formula/<codigo>', methods=['GET'])
def debug_buscar_formula(codigo):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todas as tabelas
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        encontrados = []
        
        for tabela in tabelas:
            try:
                # Busca colunas numéricas ou varchar
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (F.RDB$FIELD_TYPE IN (7, 8, 10, 14, 16, 27, 37))
                """, (tabela,))
                
                colunas = [(row[0].strip(), row[1]) for row in cursor.fetchall()]
                
                for coluna, tipo in colunas:
                    try:
                        # Tenta buscar o código
                        if tipo in (7, 8, 10, 14, 16, 27):  # Numéricos
                            sql = f"SELECT FIRST 5 * FROM {tabela} WHERE {coluna} = {codigo}"
                        else:  # VARCHAR
                            sql = f"SELECT FIRST 5 * FROM {tabela} WHERE {coluna} = '{codigo}'"
                        
                        cursor.execute(sql)
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            for row in rows:
                                registro = {}
                                for i, col in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'read'):
                                        try:
                                            val = val.read().decode('latin-1')[:200]
                                        except:
                                            val = "[BLOB]"
                                    elif hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif val is not None:
                                        val = str(val)[:200]
                                    registro[col] = val
                                encontrados.append({
                                    "tabela": tabela,
                                    "colunaEncontrada": coluna,
                                    "registro": registro
                                })
                    except:
                        pass
            except:
                pass
        
        conn.close()
        return jsonify({
            "success": True,
            "codigo": codigo,
            "totalEncontrados": len(encontrados),
            "encontrados": encontrados
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: estrutura completa das tabelas FC03xxx (produtos e observações)
@app.route('/api/debug/estrutura-tabelas-produto', methods=['GET'])
def debug_estrutura_tabelas_produto():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        tabelas = ['FC03000', 'FC03100', 'FC03200', 'FC03300', 'FC03310', 'FC03320', 'FC03900']
        resultado = {}
        
        for tabela in tabelas:
            try:
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    ORDER BY RF.RDB$FIELD_POSITION
                """, (tabela,))
                colunas = [{
                    "nome": row[0].strip(),
                    "tipo": row[1],
                    "tamanho": row[2]
                } for row in cursor.fetchall()]
                
                # Conta registros
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
                
                resultado[tabela] = {
                    "colunas": colunas,
                    "totalRegistros": total
                }
            except Exception as e:
                resultado[tabela] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca lotes e datas de um produto
@app.route('/api/debug/lotes-produto/<cdpro>', methods=['GET'])
def debug_lotes_produto(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Tabelas que podem conter lotes/datas
        tabelas_lote = ['FC06100', 'FC06200', 'FC06300', 'FC07100', 'FC07200', 'FC12110']
        
        for tabela in tabelas_lote:
            try:
                # Verifica se tabela tem CDPRO ou similar
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME
                    FROM RDB$RELATION_FIELDS RF
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (RF.RDB$FIELD_NAME LIKE '%CDPRO%' 
                         OR RF.RDB$FIELD_NAME LIKE '%PRO%'
                         OR RF.RDB$FIELD_NAME LIKE '%COD%')
                """, (tabela,))
                colunas_busca = [row[0].strip() for row in cursor.fetchall()]
                
                for col in colunas_busca:
                    try:
                        cursor.execute(f"SELECT FIRST 10 * FROM {tabela} WHERE {col} = ?", (cdpro,))
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            registros = []
                            for row in rows:
                                registro = {}
                                for i, c in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif hasattr(val, 'read'):
                                        val = "[BLOB]"
                                    elif val is not None:
                                        val = str(val)[:100]
                                    registro[c] = val
                                registros.append(registro)
                            resultado[f"{tabela}.{col}"] = {
                                "colunas": cols,
                                "registros": registros
                            }
                    except:
                        pass
            except:
                pass
        
        conn.close()
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "tabelasAnalisadas": tabelas_lote,
            "encontrados": resultado
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca observações com código 94 (Observação Ficha descoberto pelo usuário)
@app.route('/api/debug/obs-ficha-94', methods=['GET'])
def debug_obs_ficha_94():
    limite = request.args.get('limite', '50')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Busca na FC03300 com GRICP = 94
        try:
            cursor.execute(f"""
                SELECT FIRST {limite} CDPRO, TPFORMAFARMA, CDICP, GRICP, OBSER 
                FROM FC03300 
                WHERE GRICP = 94
                ORDER BY CDPRO
            """)
            
            registros = []
            for row in cursor.fetchall():
                obser = row[4]
                if obser and hasattr(obser, 'read'):
                    obser = obser.read().decode('latin-1')
                registros.append({
                    "cdpro": row[0],
                    "tipoFormaFarma": row[1],
                    "cdicp": row[2],
                    "gricp": row[3],
                    "observacao": obser[:500] if obser else None
                })
            resultado["FC03300_GRICP_94"] = registros
        except Exception as e:
            resultado["FC03300_GRICP_94"] = {"erro": str(e)}
        
        # Busca na FC03900 (se existir)
        try:
            cursor.execute(f"""
                SELECT FIRST {limite} * FROM FC03900
                ORDER BY 1
            """)
            cols = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'read'):
                        try:
                            val = val.read().decode('latin-1')[:300]
                        except:
                            val = "[BLOB]"
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:200]
                    registro[col] = val
                registros.append(registro)
            resultado["FC03900"] = {
                "colunas": cols,
                "registros": registros
            }
        except Exception as e:
            resultado["FC03900"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca componentes de um kit/fórmula pelo código do produto
@app.route('/api/debug/componentes-kit/<cdpro>', methods=['GET'])
def debug_componentes_kit(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Primeiro, busca informações do produto
        cursor.execute("""
            SELECT CDPRO, DESCR, TPPRO, TPFORMAFARMA
            FROM FC03000
            WHERE CDPRO = ?
        """, (cdpro,))
        prod = cursor.fetchone()
        if prod:
            resultado["produto"] = {
                "cdpro": prod[0],
                "descricao": prod[1],
                "tipoProduto": prod[2],
                "tipoFormaFarma": prod[3]
            }
        
        # Busca em várias tabelas possíveis de componentes
        tabelas_comp = [
            ('FC03100', 'CDPRO'),
            ('FC03200', 'CDPRO'),
            ('FC03710', 'CDPRO'),
            ('FC03720', 'CDPRO'),
            ('FC03730', 'CDPRO'),
            ('FC12110', 'CDPRO'),
        ]
        
        for tabela, coluna in tabelas_comp:
            try:
                cursor.execute(f"SELECT FIRST 20 * FROM {tabela} WHERE {coluna} = ?", (cdpro,))
                rows = cursor.fetchall()
                
                if rows:
                    cols = [desc[0].strip() for desc in cursor.description]
                    registros = []
                    for row in rows:
                        registro = {}
                        for i, col in enumerate(cols):
                            val = row[i]
                            if hasattr(val, 'read'):
                                try:
                                    val = val.read().decode('latin-1')[:200]
                                except:
                                    val = "[BLOB]"
                            elif hasattr(val, 'strftime'):
                                val = val.strftime('%d/%m/%Y')
                            elif val is not None:
                                val = str(val)[:200]
                            registro[col] = val
                        registros.append(registro)
                    resultado[tabela] = {
                        "colunas": cols,
                        "registros": registros
                    }
            except Exception as e:
                resultado[tabela] = {"erro": str(e)}
        
        # Busca requisições que usaram este produto
        try:
            cursor.execute("""
                SELECT FIRST 5 NRRQU, CDFIL, ITEMID, DESCR, QUANT, TPCMP
                FROM FC12110
                WHERE CDPRO = ?
                ORDER BY NRRQU DESC
            """, (cdpro,))
            rows = cursor.fetchall()
            if rows:
                resultado["requisicoes_com_produto"] = [{
                    "nrRequisicao": row[0],
                    "filial": row[1],
                    "itemId": row[2],
                    "descricao": row[3],
                    "quantidade": str(row[4]) if row[4] else None,
                    "tipoCmp": row[5]
                } for row in rows]
        except Exception as e:
            resultado["requisicoes_com_produto"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "cdpro": cdpro, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca todas tabelas FC06xxx e FC07xxx (lotes e fabricação)
@app.route('/api/debug/tabelas-lotes', methods=['GET'])
def debug_tabelas_lotes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE 'FC06%' 
                 OR RDB$RELATION_NAME LIKE 'FC07%'
                 OR RDB$RELATION_NAME LIKE '%LOT%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        resultado = []
        for tabela in tabelas:
            try:
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    ORDER BY RF.RDB$FIELD_POSITION
                """, (tabela,))
                colunas = [{
                    "nome": row[0].strip(),
                    "tipo": row[1],
                    "tamanho": row[2]
                } for row in cursor.fetchall()]
                
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
                
                # Pega exemplo
                cursor.execute(f"SELECT FIRST 3 * FROM {tabela}")
                cols = [desc[0].strip() for desc in cursor.description]
                exemplos = []
                for row in cursor.fetchall():
                    exemplo = {}
                    for i, col in enumerate(cols):
                        val = row[i]
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%d/%m/%Y')
                        elif hasattr(val, 'read'):
                            val = "[BLOB]"
                        elif val is not None:
                            val = str(val)[:100]
                        exemplo[col] = val
                    exemplos.append(exemplo)
                
                resultado.append({
                    "tabela": tabela,
                    "colunas": colunas,
                    "totalRegistros": total,
                    "exemplos": exemplos
                })
            except Exception as e:
                resultado.append({"tabela": tabela, "erro": str(e)})
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# DEBUG: Testar identificação de KIT (Nova lógica multi-camada)
# ============================================
@app.route('/api/debug/testar-kit/<cdpro>', methods=['GET'])
def debug_testar_kit(cdpro):
    """
    Endpoint de debug para testar a identificação de KIT com a nova lógica multi-camada.
    Testa todas as estratégias e retorna o resultado de cada uma.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {
            "cdpro": cdpro,
            "estrategias": []
        }
        
        # 1. Busca descrição do produto
        descr_produto = ""
        try:
            cursor.execute("""
                SELECT DESCR, NOMRED FROM FC03000 WHERE CDPRO = ?
            """, (cdpro,))
            row = cursor.fetchone()
            if row:
                descr_produto = row[0] or ""
                resultado["produto"] = {
                    "descr": row[0],
                    "nomred": row[1],
                    "contem_kit_no_nome": "KIT" in (row[0] or "").upper() or "KIT" in (row[1] or "").upper()
                }
        except Exception as e:
            resultado["erro_produto"] = str(e)
        
        # 2. ESTRATÉGIA: FC05000 (CDSEM = CDPRO) → CDFRM
        try:
            cursor.execute("""
                SELECT * FROM FC05000 WHERE CDSEM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            
            registros = []
            cdfrm_encontrado = None
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                    if col == 'CDFRM':
                        cdfrm_encontrado = row[i]
                registros.append(reg)
            
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDSEM = CDPRO",
                "query": f"SELECT * FROM FC05000 WHERE CDSEM = {cdpro}",
                "total": len(registros),
                "cdfrm_encontrado": cdfrm_encontrado,
                "registros": registros
            })
            
            # 3. Se encontrou CDFRM, busca componentes na FC05100
            if cdfrm_encontrado:
                cursor.execute("""
                    SELECT * FROM FC05100 WHERE CDFRM = ?
                """, (cdfrm_encontrado,))
                cols2 = [desc[0].strip() for desc in cursor.description]
                rows2 = cursor.fetchall()
                
                componentes = []
                for row2 in rows2:
                    comp = {}
                    for i, col in enumerate(cols2):
                        val = row2[i]
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%d/%m/%Y')
                        elif val is not None:
                            val = str(val)[:100]
                        comp[col] = val
                    
                    # Busca nome do componente
                    cdsac = None
                    for key in ['CDSAC', 'CDPRO', 'CDCOMP']:
                        if key in comp:
                            cdsac = comp[key]
                            break
                    
                    if cdsac:
                        try:
                            cursor.execute("SELECT DESCR FROM FC03000 WHERE CDPRO = ?", (cdsac,))
                            nome_row = cursor.fetchone()
                            if nome_row:
                                comp["NOME_COMPONENTE"] = nome_row[0]
                        except:
                            pass
                    
                    componentes.append(comp)
                
                resultado["estrategias"].append({
                    "nome": f"FC05100 onde CDFRM = {cdfrm_encontrado}",
                    "query": f"SELECT * FROM FC05100 WHERE CDFRM = {cdfrm_encontrado}",
                    "total": len(componentes),
                    "componentes": componentes
                })
        
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDSEM = CDPRO",
                "erro": str(e)
            })
        
        # 4. ESTRATÉGIA: FC03600 (TPASS contém 'KIT')
        try:
            cursor.execute("""
                SELECT * FROM FC03600 WHERE CDPRO = ? AND UPPER(TPASS) CONTAINING 'KIT'
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            
            resultado["estrategias"].append({
                "nome": "FC03600 onde CDPRO = CDPRO e TPASS contém KIT",
                "query": f"SELECT * FROM FC03600 WHERE CDPRO = {cdpro} AND UPPER(TPASS) CONTAINING 'KIT'",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC03600 onde CDPRO = CDPRO e TPASS contém KIT",
                "erro": str(e)
            })
        
        # 5. Veredicto final
        e_kit = False
        motivo = ""
        
        for est in resultado["estrategias"]:
            if est.get("total", 0) > 0:
                if "FC05100" in est.get("nome", ""):
                    e_kit = True
                    motivo = "Componentes encontrados via FC05000/FC05100"
                    break
                elif "FC03600" in est.get("nome", ""):
                    e_kit = True
                    motivo = "Componentes encontrados via FC03600"
                    break
        
        if not e_kit and resultado.get("produto", {}).get("contem_kit_no_nome"):
            e_kit = True
            motivo = "Identificado pelo nome (contém 'KIT')"
        
        resultado["veredicto"] = {
            "e_kit": e_kit,
            "motivo": motivo if e_kit else "Nenhuma estratégia encontrou componentes"
        }
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# DEBUG: FC05000/FC05100 - Estrutura de Kits (Nova lógica)
# ============================================
@app.route('/api/debug/estrutura-kit', methods=['GET'])
def debug_estrutura_kit():
    """
    Endpoint de debug para investigar a estrutura das tabelas FC05000 e FC05100.
    Retorna colunas e exemplos de registros para entender o mapeamento correto.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Analisa FC05000 (tabela de cabeçalho de kits)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC05000'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc05000 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 10 * FROM FC05000")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc05000 = []
            for row in cursor.fetchall():
                exemplo = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    exemplo[col] = val
                exemplos_fc05000.append(exemplo)
            
            resultado["FC05000"] = {
                "colunas": colunas_fc05000,
                "exemplos": exemplos_fc05000
            }
        except Exception as e:
            resultado["FC05000"] = {"erro": str(e)}
        
        # Analisa FC05100 (tabela de componentes de kits)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC05100'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc05100 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 10 * FROM FC05100")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc05100 = []
            for row in cursor.fetchall():
                exemplo = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    exemplo[col] = val
                exemplos_fc05100.append(exemplo)
            
            resultado["FC05100"] = {
                "colunas": colunas_fc05100,
                "exemplos": exemplos_fc05100
            }
        except Exception as e:
            resultado["FC05100"] = {"erro": str(e)}
        
        # Analisa FC03140 (tabela de lotes - se existir)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC03140'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc03140 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 5 * FROM FC03140")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc03140 = []
            for row in cursor.fetchall():
                exemplo = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    exemplo[col] = val
                exemplos_fc03140.append(exemplo)
            
            resultado["FC03140"] = {
                "colunas": colunas_fc03140,
                "exemplos": exemplos_fc03140
            }
        except Exception as e:
            resultado["FC03140"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/debug/componentes-kit/<cdpro>', methods=['GET'])
def debug_componentes_kit_cdpro(cdpro):
    """
    Endpoint de debug para buscar componentes de um kit específico por CDPRO.
    Testa múltiplas estratégias de busca para encontrar os componentes.
    """
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {
            "cdpro_buscado": cdpro,
            "filial": filial,
            "estrategias": []
        }
        
        # ESTRATÉGIA 1: FC05100 com CDFRM = CDPRO
        try:
            cursor.execute("""
                SELECT * FROM FC05100 WHERE CDFRM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDFRM = CDPRO",
                "query": f"SELECT * FROM FC05100 WHERE CDFRM = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDFRM = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 2: FC05100 com CDPRO = CDPRO (campo alternativo)
        try:
            cursor.execute("""
                SELECT * FROM FC05100 WHERE CDPRO = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDPRO = CDPRO",
                "query": f"SELECT * FROM FC05100 WHERE CDPRO = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDPRO = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 3: FC05000 (tabela de cabeçalho de kits)
        try:
            cursor.execute("""
                SELECT * FROM FC05000 WHERE CDFRM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDFRM = CDPRO",
                "query": f"SELECT * FROM FC05000 WHERE CDFRM = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDFRM = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 4: Buscar por DESCR na FC03000 se começa com "KIT"
        try:
            cursor.execute("""
                SELECT CDPRO, DESCR, NOMRED FROM FC03000 WHERE CDPRO = ?
            """, (cdpro,))
            row = cursor.fetchone()
            if row:
                resultado["produto"] = {
                    "cdpro": row[0],
                    "descr": row[1],
                    "nomred": row[2],
                    "e_kit_pelo_nome": "KIT" in (row[1] or "").upper() or "KIT" in (row[2] or "").upper()
                }
        except Exception as e:
            resultado["produto"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# DEBUG: FC12111 - Componentes de Kit por Requisição
# ============================================
@app.route('/api/debug/fc12111/<nrrqu>/<serier>', methods=['GET'])
def debug_fc12111(nrrqu, serier):
    """
    Endpoint de debug para validar componentes de kit na FC12111.
    FC12111 vincula: NRRQU + SERIER → CDPRO (componentes)
    """
    filial = request.args.get('filial', '279')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca componentes do kit na FC12111
        cursor.execute("""
            SELECT 
                c.CDPRO,
                c.CDPRIN,
                c.QUANT,
                c.UNIDADE,
                c.ORDCAP,
                c.TPCMP,
                p.NOMRED,
                p.DESCR
            FROM FC12111 c
            LEFT JOIN FC03000 p ON c.CDPRO = p.CDPRO
            WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
            ORDER BY c.ORDCAP
        """, (nrrqu, serier, filial))
        
        componentes = []
        for row in cursor.fetchall():
            cdpro_comp = row[0]
            
            # Busca metadados do componente (pH, lote, datas)
            ph = ""
            lote = ""
            fab = ""
            val = ""
            
            # Tenta FC06100
            try:
                cursor.execute("""
                    SELECT FIRST 1 NRLOT, DTFAB, DTVAL, PH
                    FROM FC06100
                    WHERE CDPRO = ? AND CDFIL = ?
                    ORDER BY DTVAL DESC
                """, (cdpro_comp, filial))
                lote_row = cursor.fetchone()
                if lote_row:
                    lote = str(lote_row[0]).strip() if lote_row[0] else ""
                    fab = lote_row[1].strftime('%d/%m/%Y') if lote_row[1] else ""
                    val = lote_row[2].strftime('%d/%m/%Y') if lote_row[2] else ""
                    ph = str(lote_row[3]).strip() if lote_row[3] else ""
            except:
                pass
            
            # Fallback FC07100
            if not lote:
                try:
                    cursor.execute("""
                        SELECT FIRST 1 NRLOT, DTFAB, DTVAL
                        FROM FC07100
                        WHERE CDPRO = ? AND CDFIL = ?
                        ORDER BY DTVAL DESC
                    """, (cdpro_comp, filial))
                    lote_row = cursor.fetchone()
                    if lote_row:
                        lote = str(lote_row[0]).strip() if lote_row[0] else ""
                        fab = lote_row[1].strftime('%d/%m/%Y') if lote_row[1] else ""
                        val = lote_row[2].strftime('%d/%m/%Y') if lote_row[2] else ""
                except:
                    pass
            
            componentes.append({
                "cdpro": row[0],
                "cdprin": row[1],
                "quant": str(row[2]) if row[2] else "",
                "unidade": row[3],
                "ordcap": row[4],
                "tpcmp": row[5],
                "nomred": row[6],
                "descr": row[7],
                "metadados": {
                    "ph": ph,
                    "lote": lote,
                    "fabricacao": fab,
                    "validade": val
                }
            })
        
        conn.close()
        return jsonify({
            "success": True,
            "nrrqu": nrrqu,
            "serier": serier,
            "filial": filial,
            "totalComponentes": len(componentes),
            "componentes": componentes
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# ENDPOINT PRINCIPAL - BUSCAR REQUISIÇÃO
# ============================================
@app.route('/api/requisicao/<nr_requisicao>', methods=['GET'])
def buscar_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca dados da requisição
        cursor.execute("""
            SELECT R.NRRQU, R.CDFIL, R.NOMEPA, R.PFCRM, R.NRCRM, R.UFCRM,
                   R.DTCAD, R.DTVAL, R.NRREG, R.POSOL, R.TPUSO, R.OBSERFIC,
                   R.VOLUME, R.UNIVOL, M.NOMEMED, R.TPFORMAFARMA
            FROM FC12100 R
            LEFT JOIN FC04000 M ON R.PFCRM = M.PFCRM AND R.NRCRM = M.NRCRM AND R.UFCRM = M.UFCRM
            WHERE R.NRRQU = ? AND R.CDFIL = ?
        """, (nr_requisicao, filial))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Requisição não encontrada"}), 404
        
        tipo_forma = row[15]
        
        dados_base = {
            "nrRequisicao": str(row[0]),
            "codigoFilial": str(row[1]),
            "nomePaciente": row[2] or "",
            "prefixoCRM": row[3] or "",
            "numeroCRM": row[4] or "",
            "ufCRM": row[5] or "",
            "nomeMedico": row[14] or "",
            "dataFabricacao": row[6].strftime('%d/%m/%Y') if row[6] else "",
            "dataValidade": row[7].strftime('%d/%m/%Y') if row[7] else "",
            "numeroRegistro": row[8] or "",
            "posologia": row[9] or "",
            "tipoUso": row[10] or "",
            "observacoesFicha": row[11] or "",
            "volume": str(row[12]) if row[12] else "",
            "unidadeVolume": row[13] or "",
        }
        
        # =====================================================
        # NOVA LÓGICA DE BUSCA DE ITENS (v5)
        # 
        # Usa FC12110 com LEFT JOIN em FC03140 para obter lote/datas
        # diretamente do lote registrado na requisição.
        # 
        # Para identificar KITs: usa FC03600 (associações)
        # - FC03600.TPASS indica tipo (contém 'KIT')
        # - FC03600.CDPRO é o produto principal (kit)
        # - FC03600.CDASSDO são os componentes do kit
        # =====================================================
        
        # 1. Descobre colunas das tabelas relevantes
        
        # FC03140 - lotes e datas
        colunas_fc03140 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC03140'
            """)
            colunas_fc03140 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC03140: {colunas_fc03140}")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC03140: {e}")
        
        # FC03000 - produtos
        colunas_fc03000 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC03000'
            """)
            colunas_fc03000 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC03000: {colunas_fc03000[:10]}...")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC03000: {e}")
        
        # FC03600 - associações (KITs)
        colunas_fc03600 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC03600'
            """)
            colunas_fc03600 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC03600: {colunas_fc03600}")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC03600: {e}")
        
        # Verifica se NOMRED existe na FC03000
        tem_nomred = 'NOMRED' in colunas_fc03000
        select_nomred = "p.NOMRED" if tem_nomred else "NULL as NOMRED"
        
        # Verifica se FC03600 tem as colunas necessárias para KIT
        tem_fc03600_kit = 'TPASS' in colunas_fc03600 and 'CDASSDO' in colunas_fc03600
        print(f"[DEBUG] FC03600 suporta KIT (TPASS + CDASSDO): {tem_fc03600_kit}")
        
        # Identifica coluna de lote na FC03140
        col_lote_fc03140 = None
        for col in ['NRLOT', 'CTLOT', 'LOTE']:
            if col in colunas_fc03140:
                col_lote_fc03140 = col
                break
        
        # Identifica colunas de data na FC03140
        col_fab = 'DTFAB' if 'DTFAB' in colunas_fc03140 else None
        col_val = 'DTVAL' if 'DTVAL' in colunas_fc03140 else None
        
        print(f"[DEBUG] FC03140 mapeamento: lote={col_lote_fc03140}, fab={col_fab}, val={col_val}")
        print(f"[DEBUG] FC03000 tem NOMRED: {tem_nomred}")
        
        # =====================================================
        # 2. Função para verificar se um CDPRO é KIT
        # ESTRATÉGIA MULTI-CAMADA:
        #   1) Verifica se DESCR contém "KIT" (mais confiável)
        #   2) Busca componentes via FC05000/FC05100
        #   3) Fallback: FC03600 (associações)
        # =====================================================
        def verificar_kit_completo(cdpro_check, descr_produto=""):
            """
            Verifica se um produto é KIT usando múltiplas estratégias.
            Retorna (e_kit: bool, componentes: list[dict])
            """
            componentes = []
            
            # ESTRATÉGIA 1: Verificar se descrição contém "KIT"
            descr_upper = (descr_produto or "").upper()
            e_kit_por_nome = "KIT" in descr_upper
            
            if e_kit_por_nome:
                print(f"[KIT DETECT] CDPRO={cdpro_check} identificado por nome: '{descr_produto}'")
            
            # ESTRATÉGIA 2: Buscar componentes via FC05000 + FC05100
            # FC05000: CDSEM = CDPRO → obtém CDFRM (código interno da fórmula)
            # FC05100: CDFRM → CDSAC (códigos dos componentes)
            try:
                # 2a) Busca CDFRM na FC05000 usando CDSEM = CDPRO
                cursor.execute("""
                    SELECT CDFRM FROM FC05000 WHERE CDSEM = ?
                """, (cdpro_check,))
                row_frm = cursor.fetchone()
                
                if row_frm:
                    cdfrm = row_frm[0]
                    print(f"[KIT FC05000] CDPRO={cdpro_check} → CDFRM={cdfrm}")
                    
                    # 2b) Busca componentes na FC05100 usando CDFRM
                    cursor.execute("""
                        SELECT CDSAC FROM FC05100 WHERE CDFRM = ?
                    """, (cdfrm,))
                    comp_rows = cursor.fetchall()
                    
                    if comp_rows:
                        for comp_row in comp_rows:
                            cdsac = comp_row[0]
                            
                            # Busca nome do componente na FC03000
                            nome_comp = ""
                            try:
                                cursor.execute("""
                                    SELECT DESCR FROM FC03000 WHERE CDPRO = ?
                                """, (cdsac,))
                                nome_row = cursor.fetchone()
                                if nome_row:
                                    nome_comp = (nome_row[0] or "").strip()
                            except:
                                pass
                            
                            componentes.append({
                                "cdpro": cdsac,
                                "nome": nome_comp
                            })
                        
                        print(f"[KIT FC05100] CDFRM={cdfrm} → {len(componentes)} componentes: {[c['cdpro'] for c in componentes]}")
                        return True, componentes
                
            except Exception as e:
                print(f"[KIT DEBUG] Erro FC05000/FC05100: {e}")
            
            # ESTRATÉGIA 3: Fallback para FC03600 (associações)
            if tem_fc03600_kit:
                try:
                    cursor.execute("""
                        SELECT CDASSDO 
                        FROM FC03600 
                        WHERE CDPRO = ? AND UPPER(TPASS) CONTAINING 'KIT'
                    """, (cdpro_check,))
                    comp_fc03600 = cursor.fetchall()
                    
                    if comp_fc03600:
                        for comp_row in comp_fc03600:
                            cdassdo = comp_row[0]
                            
                            # Busca nome do componente
                            nome_comp = ""
                            try:
                                cursor.execute("""
                                    SELECT DESCR FROM FC03000 WHERE CDPRO = ?
                                """, (cdassdo,))
                                nome_row = cursor.fetchone()
                                if nome_row:
                                    nome_comp = (nome_row[0] or "").strip()
                            except:
                                pass
                            
                            componentes.append({
                                "cdpro": cdassdo,
                                "nome": nome_comp
                            })
                        
                        print(f"[KIT FC03600] CDPRO={cdpro_check} → {len(componentes)} componentes: {[c['cdpro'] for c in componentes]}")
                        return True, componentes
                        
                except Exception as e:
                    print(f"[KIT DEBUG] Erro FC03600: {e}")
            
            # ESTRATÉGIA 4: Se foi identificado por nome mas não achou componentes,
            # retorna como kit mesmo assim (os componentes serão editados manualmente)
            if e_kit_por_nome:
                print(f"[KIT NOME] CDPRO={cdpro_check} é KIT por nome mas sem componentes no banco")
                return True, []
            
            return False, []
        
        # =====================================================
        # 3. Função para buscar dados de lote de um componente
        # =====================================================
        def buscar_dados_lote(cdpro_comp, ctlot_req):
            """Busca DTFAB e DTVAL do componente via FC03140"""
            if not col_lote_fc03140 or not (col_fab or col_val):
                return None, None
            
            try:
                select_fab = f"l.{col_fab}" if col_fab else "NULL"
                select_val_q = f"l.{col_val}" if col_val else "NULL"
                
                cursor.execute(f"""
                    SELECT {select_fab}, {select_val_q}, l.{col_lote_fc03140}
                    FROM FC03140 l
                    WHERE l.CDPRO = ? AND l.{col_lote_fc03140} = ?
                """, (cdpro_comp, ctlot_req))
                row = cursor.fetchone()
                
                if row:
                    return row[0], row[1]  # DTFAB, DTVAL
                return None, None
            except Exception as e:
                print(f"[DEBUG] Erro ao buscar lote FC03140: {e}")
                return None, None
        
        # 2. Monta query principal com LEFT JOIN dinâmico
        # Busca itens da requisição com dados do produto e lote
        if col_lote_fc03140 and (col_fab or col_val):
            # FC03140 disponível com lote e datas
            select_datas = f"l.{col_fab}" if col_fab else "NULL"
            select_val = f"l.{col_val}" if col_val else "NULL"
            
            # IMPORTANTE: Busca TODOS os itens da requisição SEM filtro TPCMP
            # para garantir que todos os componentes de kit sejam retornados
            query_itens = f"""
                SELECT 
                    i.SERIER,
                    i.ITEMID,
                    i.CDPRO,
                    i.CDPRIN,
                    i.DESCR,
                    i.QUANT,
                    i.UNIDA,
                    i.NRLOT,
                    i.CTLOT,
                    p.DESCR as DESCR_PROD,
                    {select_nomred},
                    {select_datas} as DTFAB,
                    {select_val} as DTVAL
                FROM FC12110 i
                LEFT JOIN FC03000 p ON p.CDPRO = i.CDPRO
                LEFT JOIN FC03140 l ON l.CDPRO = i.CDPRO 
                    AND (l.{col_lote_fc03140} = i.NRLOT OR l.{col_lote_fc03140} = i.CTLOT)
                WHERE i.NRRQU = ? AND i.CDFIL = ?
                ORDER BY i.SERIER, i.ITEMID
            """
        else:
            # Fallback sem FC03140
            # IMPORTANTE: Busca TODOS os itens SEM filtro TPCMP
            query_itens = f"""
                SELECT 
                    i.SERIER,
                    i.ITEMID,
                    i.CDPRO,
                    i.CDPRIN,
                    i.DESCR,
                    i.QUANT,
                    i.UNIDA,
                    i.NRLOT,
                    i.CTLOT,
                    p.DESCR as DESCR_PROD,
                    {select_nomred},
                    NULL as DTFAB,
                    NULL as DTVAL
                FROM FC12110 i
                LEFT JOIN FC03000 p ON p.CDPRO = i.CDPRO
                WHERE i.NRRQU = ? AND i.CDFIL = ?
                ORDER BY i.SERIER, i.ITEMID
            """
        
        print(f"[DEBUG] Query itens: {query_itens.strip()[:200]}...")
        cursor.execute(query_itens, (nr_requisicao, filial))
        
        itens_raw = cursor.fetchall()
        print(f"[DEBUG] {len(itens_raw)} itens encontrados para requisição {nr_requisicao}")
        
        # 3. Agrupa itens por SERIER para identificar KITs
        # Se múltiplos itens têm o mesmo SERIER, é um KIT
        from collections import defaultdict
        itens_por_serier = defaultdict(list)
        
        for row in itens_raw:
            serier = row[0]
            itemid = row[1]
            cdpro = row[2]
            cdprin = row[3]
            descr = row[4]
            quant = row[5]
            unida = row[6]
            nrlot = row[7]
            ctlot = row[8]
            descr_prod = row[9]
            nomred = row[10]
            dtfab = row[11]
            dtval = row[12]
            
            itens_por_serier[serier].append({
                'serier': serier,
                'itemid': itemid,
                'cdpro': cdpro,
                'cdprin': cdprin,
                'descr': descr or descr_prod or '',
                'quant': quant,
                'unida': unida,
                'nrlot': str(nrlot).strip() if nrlot else '',
                'ctlot': str(ctlot).strip() if ctlot else '',
                'nomred': nomred or '',
                'dtfab': dtfab,
                'dtval': dtval,
            })
        
        print(f"[DEBUG] {len(itens_por_serier)} grupos por SERIER")
        for serier, items in itens_por_serier.items():
            print(f"  SERIER={serier}: {len(items)} item(s)")
        
        # Lista de materiais a excluir da composição (embalagens, veículos, conservantes)
        materiais_excluir = [
            'TAMPA', 'SELO', 'FR AMBAR', 'FRASCO', 'AMPOLA',
            'SOLUCAO FISIOLOGICA', 'AGUA PARA INJETAVEIS', 'ALCOOL BENZILICO'
        ]
        
        # Função para simplificar nome de mesclas
        def simplificar_nome_mescla(nome_completo):
            """Extrai nome simplificado de mesclas (ex: 'AMP TRISH 10MG/ML' -> 'TRISH')"""
            if not nome_completo:
                return ""
            
            nome = nome_completo.upper().strip()
            
            # Remove prefixos comuns
            prefixos = ['AMP ', 'CX ', 'FRS ', 'PACOTE ', 'KIT ']
            for prefixo in prefixos:
                if nome.startswith(prefixo):
                    nome = nome[len(prefixo):]
                    break
            
            # Pega primeira palavra significativa (antes de números/concentração)
            partes = nome.split()
            if partes:
                nome_simples = partes[0]
                # Se nome muito curto ou genérico, pega mais palavras
                if len(nome_simples) < 3 and len(partes) > 1:
                    nome_simples = " ".join(partes[:2])
                return nome_simples
            
            return nome_completo
        
        # =====================================================
        # 4. PROCESSA CADA GRUPO POR SERIER
        # Para cada item: verifica se é KIT via FC03600
        # =====================================================
        data = []
        
        for serier in sorted(itens_por_serier.keys()):
            items_grupo = itens_por_serier[serier]
            
            # Pega o primeiro item do grupo para análise
            item_principal = items_grupo[0]
            cdpro_principal = item_principal['cdpro']
            descr_principal = item_principal['descr']
            
            print(f"\n{'='*60}")
            print(f"PROCESSANDO SERIER={serier} ({len(items_grupo)} item(s))")
            print(f"  CDPRO principal: {cdpro_principal}")
            print(f"  DESCR principal: {descr_principal}")
            
            # =====================================================
            # Verifica se é KIT usando a função multi-estratégia
            # =====================================================
            e_kit, componentes_info = verificar_kit_completo(cdpro_principal, descr_principal)
            
            if e_kit:
                # =====================================================
                # É KIT: Monta rótulo com componentes
                # =====================================================
                print(f"  -> KIT identificado com {len(componentes_info)} componentes")
                
                nome_kit = descr_principal
                ctlot_req = item_principal['ctlot'] or item_principal['nrlot'] or ''
                
                # Monta lista de componentes formatada
                componentes_kit = []
                
                for comp_info in componentes_info:
                    cdpro_comp = comp_info['cdpro']
                    nome_comp = comp_info['nome'] or f"COMP-{cdpro_comp}"
                    
                    # Remove prefixos do nome
                    nome_upper = nome_comp.upper()
                    for prefixo in ['AMP ', 'CX ', 'KIT ', 'FRS ']:
                        if nome_upper.startswith(prefixo):
                            nome_comp = nome_comp[len(prefixo):]
                            break
                    
                    # Busca lote e datas do componente via FC03140
                    dtfab, dtval = buscar_dados_lote(cdpro_comp, ctlot_req)
                    
                    # Formata datas
                    fab_str = ""
                    val_str = ""
                    if dtfab:
                        try:
                            fab_str = dtfab.strftime('%m/%y')
                        except:
                            fab_str = str(dtfab)
                    if dtval:
                        try:
                            val_str = dtval.strftime('%m/%y')
                        except:
                            val_str = str(dtval)
                    
                    componentes_kit.append({
                        "codigo": str(cdpro_comp),
                        "nome": nome_comp.upper(),
                        "ph": "",  # pH será preenchido manualmente
                        "lote": ctlot_req,
                        "fabricacao": fab_str,
                        "validade": val_str
                    })
                    print(f"  [COMP] CDPRO={cdpro_comp}, {nome_comp}, LT:{ctlot_req}, F:{fab_str}, V:{val_str}")
                # Usa dados do primeiro item para o rótulo
                rotulo = {
                    **dados_base,
                    "nrItem": str(serier),
                    "formula": simplificar_nome_mescla(nome_kit),
                    "volume": str(item_principal['quant']) if item_principal['quant'] else dados_base["volume"],
                    "unidadeVolume": item_principal['unida'] or dados_base["unidadeVolume"],
                    "lote": "",  # KIT não tem lote único - cada componente tem o seu
                    "quantidade": str(int(item_principal['quant'])) if item_principal['quant'] else "",
                    "composicao": "",
                    "aplicacao": "",
                    "descricaoProduto": nome_kit,
                    "observacoes": "",
                    "tipoItem": "KIT",
                    "componentes": componentes_kit
                }
                
                print(f"  -> Rótulo KIT com {len(componentes_kit)} componentes")
                data.append(rotulo)
                
            else:
                # =====================================================
                # ITEM ÚNICO: Processa normalmente
                # =====================================================
                item = items_grupo[0]
                cdpro = item['cdpro']
                cdprin = item['cdprin']
                nome_produto = item['descr']
                item_id = item['itemid']
                
                print(f"  CDPRO: '{cdpro}'")
                print(f"  CDPRIN: '{cdprin}'")
                print(f"  NOME PRODUTO: '{nome_produto}'")
                
                # Determina qual código usar para buscar composição
                cdprin_str = str(cdprin).strip() if cdprin else ""
                cdpro_str = str(cdpro).strip()
                
                if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                    codigo_busca = cdprin_str
                    print(f"  -> USANDO CDPRIN ({cdprin_str}) para buscar composição")
                else:
                    codigo_busca = cdpro_str
                    print(f"  -> USANDO CDPRO ({cdpro_str}) para buscar composição")
                
                codigo_busca_padded = codigo_busca.zfill(8)
                
                # Query FC99999 para composição
                cursor.execute("""
                    SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                    FROM FC99999 
                    WHERE ARGUMENTO = ? 
                       OR ARGUMENTO = ?
                       OR ARGUMENTO = ?
                       OR ARGUMENTO = ?
                    ORDER BY SUBARGUM
                """, (codigo_busca, codigo_busca_padded, f'OBSFIC{codigo_busca}', f'OBSFIC{codigo_busca_padded}'))
                todos_args_exato = cursor.fetchall()
                
                todos_args = todos_args_exato
                
                # Se não encontrou com exato, tenta CONTAINING
                if not todos_args:
                    cursor.execute("""
                        SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                        FROM FC99999 
                        WHERE ARGUMENTO CONTAINING ?
                        ORDER BY ARGUMENTO, SUBARGUM
                    """, (codigo_busca,))
                    todos_args_containing = cursor.fetchall()
                    
                    for arg in todos_args_containing:
                        argumento = arg[0].strip() if arg[0] else ""
                        codigo_no_arg = argumento.replace("OBSFIC", "").strip()
                        
                        if (codigo_busca in codigo_no_arg or 
                            codigo_busca_padded in codigo_no_arg or
                            argumento.endswith(codigo_busca) or 
                            argumento.endswith(codigo_busca_padded)):
                            todos_args.append(arg)
                
                # Processa registros encontrados
                ativos_mescla = []
                aplicacao_fc99999 = ""
                IGNORAR_ATIVOS = ['ETIQUETA', 'CATALOGO', 'PREGA', 'SUG.', 'SUGESTAO', 'CATÁLOGO', 'INSTRUC', 'AVISO']
                
                for arg in todos_args:
                    texto = arg[2]
                    if texto and hasattr(texto, 'read'):
                        texto = texto.read().decode('latin-1')
                    texto = texto.strip() if texto else ""
                    
                    if not texto:
                        continue
                    
                    texto_upper = texto.upper()
                    
                    if "APLICA" in texto_upper and ":" in texto:
                        aplicacao_fc99999 = texto.split(":", 1)[1].strip()
                        continue
                    
                    if any(ignorar in texto_upper for ignorar in IGNORAR_ATIVOS):
                        continue
                    
                    if len(texto) > 200 and ',' not in texto:
                        continue
                    
                    texto_limpo = texto
                    if texto_upper.startswith("OBS:"):
                        texto_limpo = texto[4:].strip()
                    elif texto_upper.startswith("OBS :"):
                        texto_limpo = texto[5:].strip()
                    
                    if texto_limpo.strip():
                        ativos_mescla.append(texto_limpo)
                
                # Determina se é MESCLA
                nome_produto_upper = nome_produto.upper() if nome_produto else ""
                e_mescla = False
                composicao = ""
                nome_formula = nome_produto
                
                if ativos_mescla:
                    primeiro_ativo = ativos_mescla[0]
                    
                    if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                        e_mescla = True
                    elif ',' in primeiro_ativo:
                        e_mescla = True
                    elif primeiro_ativo and nome_produto_upper not in primeiro_ativo.upper():
                        palavras_produto = [p for p in nome_produto_upper.split() if len(p) > 3]
                        if not any(p in primeiro_ativo.upper() for p in palavras_produto[:2]):
                            e_mescla = True
                    
                    if e_mescla:
                        composicao = primeiro_ativo
                        nome_formula = nome_produto.replace("AMP ", "").strip() if nome_produto else ""
                
                # Busca aplicação na FC03300 se não encontrou na FC99999
                aplicacao = aplicacao_fc99999
                descricao_produto = ""
                
                if not aplicacao:
                    cursor.execute("""
                        SELECT CDICP, OBSER 
                        FROM FC03300 
                        WHERE CDPRO = ?
                        ORDER BY CDICP
                    """, (cdpro,))
                    
                    observacoes = cursor.fetchall()
                    
                    for obs in observacoes:
                        cdicp = str(obs[0]).strip().zfill(5)
                        texto = obs[1]
                        if texto and hasattr(texto, 'read'):
                            texto = texto.read().decode('latin-1')
                        texto = texto.strip() if texto else ""
                        
                        texto_upper = texto.upper()
                        if texto_upper.startswith("APLICAÇÃO:") or texto_upper.startswith("APLICACAO:"):
                            aplicacao = texto[10:].strip()
                        elif cdicp == '00004' and not descricao_produto:
                            descricao_produto = texto
                
                # Limpa aplicação se for muito longa
                if len(aplicacao) > 30 or ',' in aplicacao:
                    aplicacao = ""
                
                # Formata datas do item
                fab_str = ""
                val_str = ""
                if item['dtfab']:
                    try:
                        fab_str = item['dtfab'].strftime('%d/%m/%Y')
                    except:
                        fab_str = str(item['dtfab'])
                if item['dtval']:
                    try:
                        val_str = item['dtval'].strftime('%d/%m/%Y')
                    except:
                        val_str = str(item['dtval'])
                
                # Se não tem datas do lote, usa as datas base da requisição
                if not fab_str:
                    fab_str = dados_base.get("dataFabricacao", "")
                if not val_str:
                    val_str = dados_base.get("dataValidade", "")
                
                tipo_item = "MESCLA" if e_mescla else "PRODUTO ÚNICO"
                
                rotulo = {
                    **dados_base,
                    "nrItem": str(serier),
                    "formula": nome_formula,
                    "volume": str(item['quant']) if item['quant'] else dados_base["volume"],
                    "unidadeVolume": item['unida'] or dados_base["unidadeVolume"],
                    "lote": item['nrlot'] or item['ctlot'] or '',
                    "quantidade": str(int(item['quant'])) if item['quant'] else "",
                    "composicao": composicao,
                    "aplicacao": aplicacao,
                    "descricaoProduto": descricao_produto,
                    "observacoes": composicao,
                    "tipoItem": tipo_item,
                    "dataFabricacao": fab_str,
                    "dataValidade": val_str,
                }
                
                print(f"  -> TIPO: {tipo_item}")
                data.append(rotulo)
        
        conn.close()
        
        if not data:
            data = [{**dados_base, "nrItem": "0", "formula": "", "lote": "", "quantidade": "", "observacoes": "", "composicao": "", "aplicacao": "", "descricaoProduto": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# FUNÇÕES DE IMPRESSÃO
# ============================================

def gerar_ppla_ampcx(rotulo, farmacia):
    """
    Gera comandos PPLA para layout AMP_CX (76mm x 35mm).
    Argox OS-2140 @ 203dpi: 76mm = 608 dots, 35mm = 280 dots
    """
    # Dados do rótulo
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    
    # Médico
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')
    
    # Composição (prioriza composicao, senão usa formula)
    composicao = rotulo.get('composicao', '') or rotulo.get('formula', '')
    composicao = (composicao or '')[:50].upper()
    
    # Dados de fabricação
    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')
    
    # Aplicação e conteúdo
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    
    # Registro
    registro = rotulo.get('numeroRegistro', '')
    
    # Monta linha 4: pH, Lote, Fab, Val
    linha4_parts = []
    if ph:
        linha4_parts.append(f"pH:{ph}")
    if lote:
        linha4_parts.append(f"LT:{lote}")
    if fab:
        linha4_parts.append(f"F:{fab}")
    if val:
        linha4_parts.append(f"V:{val}")
    linha4 = " ".join(linha4_parts)
    
    # Comandos PPLA
    # A = texto: x,y,rotação,fonte,mult_h,mult_v,N/R,texto
    # Fonte 2 = 10x16, Fonte 1 = 8x12
    comandos = [
        "N",                                                    # Limpa buffer
        "q608",                                                 # Largura em dots
        "Q280,24",                                              # Altura + gap
        f'A20,15,0,2,1,1,N,"{paciente}"',                       # L1: Paciente
        f'A470,15,0,1,1,1,N,"REQ:{nr_req}-{nr_item}"',          # L1: Requisição (direita)
        f'A20,45,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}"',  # L2: Médico
        f'A20,75,0,2,1,1,N,"{composicao}"',                     # L3: Composição
        f'A20,105,0,1,1,1,N,"{linha4}"',                        # L4: pH/Lote/Fab/Val
        f'A20,135,0,1,1,1,N,"APLICACAO: {aplicacao}"',          # L5: Aplicação
        f'A20,165,0,1,1,1,N,"CONTEM: {contem}"',                # L6: Contém
        f'A20,195,0,1,1,1,N,"Reg: {registro}"',                 # L7: Registro
        "P1",                                                   # Imprime 1 cópia
    ]
    
    return "\r\n".join(comandos)


def imprimir_compartilhada(caminho_impressora, comandos):
    """
    Envia comandos PPLA para impressora compartilhada Windows.
    caminho_impressora: ex: \\\\Campos2\\Campos2
    """
    if not PRINTING_AVAILABLE:
        return {"success": False, "error": "pywin32 não disponível"}
    
    try:
        # Abre a impressora
        hPrinter = win32print.OpenPrinter(caminho_impressora)
        
        try:
            # Inicia documento
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, "RAW"))
            
            try:
                win32print.StartPagePrinter(hPrinter)
                
                # Codifica comandos em CP850 (padrão Argox)
                dados = comandos.encode('cp850', errors='replace')
                win32print.WritePrinter(hPrinter, dados)
                
                win32print.EndPagePrinter(hPrinter)
            finally:
                win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
        
        return {"success": True}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================
# ENDPOINTS DE IMPRESSÃO
# ============================================

@app.route('/api/verificar-impressora', methods=['POST'])
def verificar_impressora():
    """Verifica se a impressora está acessível."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    try:
        hPrinter = win32print.OpenPrinter(caminho)
        win32print.ClosePrinter(hPrinter)
        return jsonify({"success": True, "message": "Impressora acessível"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/imprimir-teste', methods=['POST'])
def imprimir_teste():
    """Imprime etiqueta de teste."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    # Etiqueta de teste simples
    comandos = [
        "N",
        "q608",
        "Q280,24",
        'A20,50,0,3,1,1,N,"*** TESTE DE IMPRESSAO ***"',
        'A20,100,0,2,1,1,N,"Argox OS-2140 - PPLA"',
        'A20,150,0,2,1,1,N,"Impressora configurada com sucesso!"',
        'A20,200,0,1,1,1,N,"Sistema de Rotulos - Pro Pharmacos"',
        "P1",
    ]
    
    resultado = imprimir_compartilhada(caminho, "\r\n".join(comandos))
    
    if resultado["success"]:
        return jsonify({"success": True, "message": "Etiqueta de teste enviada"})
    else:
        return jsonify({"success": False, "error": resultado["error"]}), 500


@app.route('/api/imprimir', methods=['POST'])
def imprimir_rotulos():
    """Imprime rótulos selecionados."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    rotulos = data.get('rotulos', [])
    layout_tipo = data.get('layoutTipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400
    
    impressos = 0
    erros = []
    
    for rotulo in rotulos:
        try:
            # Gera comandos PPLA (por enquanto só AMP_CX)
            if layout_tipo == 'AMP_CX':
                comandos = gerar_ppla_ampcx(rotulo, farmacia)
            else:
                # Para outros layouts, usa o mesmo por enquanto
                comandos = gerar_ppla_ampcx(rotulo, farmacia)
            
            resultado = imprimir_compartilhada(caminho, comandos)
            
            if resultado["success"]:
                impressos += 1
            else:
                erros.append(f"Rótulo {rotulo.get('id', '?')}: {resultado['error']}")
        
        except Exception as e:
            erros.append(f"Rótulo {rotulo.get('id', '?')}: {str(e)}")
    
    if impressos == len(rotulos):
        return jsonify({"success": True, "impressos": impressos})
    elif impressos > 0:
        return jsonify({"success": True, "impressos": impressos, "erros": erros})
    else:
        return jsonify({"success": False, "error": "Nenhum rótulo impresso", "erros": erros}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Servidor iniciando na porta 5000...")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print("Teste: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
