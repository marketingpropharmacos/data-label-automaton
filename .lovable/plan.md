

## Plano: Ajustar layout AMP10 para paridade com Fórmula Certa

### Layout de referência (foto)
```text
GABRIELLE TOMSEN ALBERS          REQ:009148-4
DR(A)GABRIELLE TOMSEN ALBERS     CREFITO-RS-200023
HIDROXIAPATITA DE CALCIO NANOESFERAS 15%
pH:7,0   L:817/26   F:03/26   V:03/27
USO EM CONSULTORIO   APLICACAO:SC SUPERFICIAL
CONTEM: 2 SERINGAS DE 1ML
REG:21872
```

### Problemas no código atual
1. Usa `tipoUso` em vez de `posologia` na linha de uso
2. Falta `F:` (data fabricação) na linha de metadados pH/L/V
3. Falta linha de `CONTEM`
4. `REG:` aparece antes dos metadados em vez de no final
5. `APLICACAO` aparece dentro dos metadados pH/L/F/V em vez de junto com USO

### Alterações

**`src/components/LabelTextEditor.tsx`** — função `generateTextAmp10` (linhas 346-404):

Reorganizar a ordem das linhas para item não-kit:
1. **Linha 1**: PACIENTE + REQ
2. **Linha 2**: DR(A)NOME + CONSELHO
3. **Linha 3+**: Composição/fórmula (wrap)
4. **Linha meta**: `pH:X,X   L:XXX/XX   F:MM/AA   V:MM/AA`
5. **Linha uso**: `posologia` + `APLICACAO:XXX` (compactLine)
6. **Linha contem**: `CONTEM: X` (do campo `rotulo.contem`)
7. **Linha REG**: `REG:XXXXX` (movida para o final)

Detalhes:
- Remover `APLICAÇÃO` do array `metaParts` — mover para a linha de uso
- Adicionar `F:` (fabricação) no array `metaParts` entre L e V
- Substituir `tipoUso` por `posologia` (igual ao fix já feito no AMP_CX)
- Adicionar linha `CONTEM: ${rotulo.contem}` antes de REG
- Mover `REG:` para o final do rótulo

Para kit: mesma lógica de reordenação — cada componente mostra nome + pH/L/F/V, depois no final vem USO+APLICAÇÃO, CONTEM, REG.

### Arquivo alterado
- `src/components/LabelTextEditor.tsx` — ~30 linhas na função `generateTextAmp10`

