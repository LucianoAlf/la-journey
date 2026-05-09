# Backlog de Desenvolvimento - LA Journey

Atualizado em: 2026-05-09

## Agora

1. Testar renderizacao completa do template "Fundamentos da Teoria Musical"
   - Validar todas as notacoes AlphaTex.
   - Validar blocos de teclado.
   - Validar `chord_grid`.
   - Confirmar comportamento no preview/editor e preparar lista objetiva de ajustes visuais.

2. Verificar fluxo ponta a ponta de template
   - Gerador -> Usar Template.
   - Clonar material.
   - Abrir Editor.
   - Confirmar 151 blocos carregados.
   - Confirmar que o material clonado continua editavel.

## Depois

3. Fazer `chord_grid` usar `chord_library` real
   - O preview atual usa lookup local em `chordAutoFillService`.
   - O banco correto ja possui mais de 10 mil acordes em `chord_library`.
   - O refinamento visual do template depende desses diagramas reais, especialmente nos blocos de violao.

## Antes do beta com escolas Emusys

4. Substituir policies temporarias `dev_admin_all`
   - As policies foram criadas apenas para destravar o ambiente de desenvolvimento.
   - Elas nao podem ir para producao/beta externo.
   - Trocar por RLS multi-tenant real antes de liberar escolas externas.

5. Versionar backend Supabase no repo local
   - Hoje o banco remoto tem historico de migrations que nao esta integralmente no repo.
   - Trazer migrations e Edge Functions para `supabase/`.
   - Isso reduz risco em caso de reset, branch ou recriacao do projeto.

6. Resolver bundle grande
   - O build ainda alerta sobre chunk principal acima de 500 kB.
   - `aiService` e importado dinamicamente em um ponto, mas tambem estaticamente em outros, impedindo code splitting efetivo.
   - Revisar imports e aplicar chunking antes do beta.

## Observacao de seguranca

Enquanto o projeto estiver em desenvolvimento single-school, o modo dev admin esta aceitavel para velocidade. Antes de qualquer beta com escolas externas, este backlog vira bloqueador de release.
