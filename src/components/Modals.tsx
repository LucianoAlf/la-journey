import { Modal } from './Modal';
import { useAppContext } from '../AppContext';
import { 
  FloppyDisk, Sparkle, Article, TextAa, Image as ImageIcon, Guitar, 
  MusicNotesSimple, ListNumbers, Barbell, MusicNote, Lightbulb, Trophy, QrCode, Minus 
} from '@phosphor-icons/react';

export function Modals() {
  const { isModalOpen, closeModal, showToast } = useAppContext();

  return (
    <>
      {/* Modal Jornada */}
      <Modal 
        isOpen={isModalOpen('modal-jornada')} 
        onClose={() => closeModal('modal-jornada')}
        title={<>Nova <em className="not-italic text-accent">Jornada</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome</label>
            <input className="form-input" placeholder="Jornada Violão Adulto" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Violão</option><option>Guitarra</option><option>Teclado</option>
              <option>Piano</option><option>Canto</option><option>Bateria</option>
              <option>Baixo</option><option>Ukulele</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Público-alvo</label>
            <select className="form-select">
              <option>Adulto</option><option>Teen</option><option>Kids</option><option>Baby</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Aulas por Stage</label>
            <select className="form-select">
              <option>40</option><option>30</option><option>20</option>
            </select>
          </div>
        </div>
        <div className="p-4 bg-azul-soft rounded-[var(--radius-sm)] mb-4">
          <div className="text-[11px] text-text3 mb-2">⚓ METODOLOGIA</div>
          <div className="text-[13px] text-text2">Ancoragem de Fundamentos — cada conteúdo vivenciado, fixado e celebrado antes de avançar.</div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-jornada')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-jornada'); showToast('✅ Jornada criada!'); }}>
            <FloppyDisk size={16} /> Criar Jornada
          </button>
        </div>
      </Modal>

      {/* Modal Aluno */}
      <Modal 
        isOpen={isModalOpen('modal-aluno')} 
        onClose={() => closeModal('modal-aluno')}
        title={<>Novo <em className="not-italic text-accent">Aluno</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome completo</label>
            <input className="form-input" placeholder="Nome do aluno" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">WhatsApp</label>
            <input className="form-input" placeholder="(21) 99999-0000" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Violão</option><option>Guitarra</option><option>Teclado</option>
              <option>Canto</option><option>Bateria</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Turma</label>
            <select className="form-select">
              <option>Violão Adulto — Seg/Qua</option><option>Guitarra Rock — Ter/Qui</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Responsável</label>
            <input className="form-input" placeholder="Nome do responsável" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">WhatsApp responsável</label>
            <input className="form-input" placeholder="(21) 99999-0000" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-aluno')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-aluno'); showToast('✅ Aluno cadastrado!'); }}>
            <FloppyDisk size={16} /> Cadastrar
          </button>
        </div>
      </Modal>

      {/* Modal Música */}
      <Modal 
        isOpen={isModalOpen('modal-musica')} 
        onClose={() => closeModal('modal-musica')}
        title={<>Nova <em className="not-italic text-accent">Música</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Título</label>
            <input className="form-input" placeholder="Nome da música" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Artista</label>
            <input className="form-input" placeholder="Nome do artista" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tonalidade</label>
            <select className="form-select">
              <option>C</option><option>D</option><option>E</option><option>G</option>
              <option>A</option><option>Am</option><option>Em</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Gênero</label>
            <select className="form-select">
              <option>Rock</option><option>MPB</option><option>Pop</option>
              <option>Reggae</option><option>Sertanejo</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Dificuldade</label>
            <select className="form-select">
              <option>1 - Iniciante</option><option>2 - Fácil</option><option>3 - Médio</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Acordes</label>
            <input className="form-input" placeholder="C, G, Am, F" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-musica')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-musica'); showToast('✅ Música adicionada!'); }}>
            <FloppyDisk size={16} /> Salvar
          </button>
        </div>
      </Modal>

      {/* Modal Conquista */}
      <Modal 
        isOpen={isModalOpen('modal-conquista')} 
        onClose={() => closeModal('modal-conquista')}
        title={<>Nova <em className="not-italic text-accent">Conquista</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome</label>
            <input className="form-input" placeholder="Primeiro Acorde" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Descrição</label>
            <input className="form-input" placeholder="Tocou o primeiro acorde" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tipo</label>
            <select className="form-select">
              <option>Milestone</option><option>Challenge</option><option>Streak</option><option>Special</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Pontos</label>
            <input className="form-input" placeholder="100" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-conquista')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-conquista'); showToast('✅ Conquista criada!'); }}>
            <FloppyDisk size={16} /> Criar
          </button>
        </div>
      </Modal>

      {/* Modal Template */}
      <Modal 
        isOpen={isModalOpen('modal-template')} 
        onClose={() => closeModal('modal-template')}
        title={<>Novo <em className="not-italic text-accent">Template</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome</label>
            <input className="form-input" placeholder="Falta consecutiva" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Trigger</label>
            <select className="form-select">
              <option>Manual</option><option>Falta detectada</option>
              <option>Checkpoint completo</option><option>Agendado</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Mensagem</label>
          <textarea className="form-textarea" placeholder="Oi {aluno}! Preparei um material pra você não ficar pra trás 🎸"></textarea>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-template')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-template'); showToast('✅ Template salvo!'); }}>
            <FloppyDisk size={16} /> Salvar
          </button>
        </div>
      </Modal>

      {/* Modal Turma */}
      <Modal 
        isOpen={isModalOpen('modal-turma')} 
        onClose={() => closeModal('modal-turma')}
        title={<>Nova <em className="not-italic text-accent">Turma</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome da turma</label>
            <input className="form-input" placeholder="Violão Adulto — Seg/Qua 19h" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento / Disciplina</label>
            <select className="form-select">
              <option>Violão</option><option>Guitarra</option><option>Teclado</option>
              <option>Piano</option><option>Canto</option><option>Bateria</option>
              <option>Baixo</option><option>Ukulele</option><option>Musicalização (Baby)</option>
              <option>Musicalização (Kids)</option><option>Iniciação (Heart)</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Professor</label>
            <select className="form-select">
              <option>Renan</option><option>Kinho</option><option>Peterson</option>
              <option>Jeyson</option><option>Juliana</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Jornada vinculada</label>
            <select className="form-select">
              <option>Violão Adulto Padrão</option><option>Guitarra Rock</option>
              <option>Canto Popular</option><option>Teclado Iniciante</option>
              <option>Baby Class</option><option>Kids</option><option>Heart</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Horário</label>
            <input className="form-input" placeholder="Seg/Qua 19:00" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Max. alunos</label>
            <input className="form-input" placeholder="10" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Unidade</label>
            <select className="form-select">
              <option>Campo Grande</option><option>Recreio</option><option>Barra</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-turma')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-turma'); showToast('✅ Turma criada!'); }}>
            <FloppyDisk size={16} /> Criar Turma
          </button>
        </div>
      </Modal>

      {/* Modal Imagem IA */}
      <Modal 
        isOpen={isModalOpen('modal-imagem')} 
        onClose={() => closeModal('modal-imagem')}
        title={<>Gerar <em className="not-italic text-accent">Imagem IA</em></>}
      >
        <div className="form-group">
          <label className="form-label">Descrição da imagem</label>
          <textarea className="form-textarea" placeholder="Ex: Foto profissional de um violão clássico sobre fundo escuro, iluminação lateral suave, estilo editorial para material didático musical"></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Estilo</label>
            <select className="form-select">
              <option>Fotográfico (realista)</option><option>Ilustração didática</option>
              <option>Diagrama técnico</option><option>Artístico / Editorial</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Resolução</label>
            <select className="form-select">
              <option>512x512</option><option>1024x1024</option>
              <option>768x512 (paisagem)</option><option>512x768 (retrato)</option>
            </select>
          </div>
        </div>
        <div className="p-3.5 bg-azul-soft rounded-[var(--radius-sm)] mb-4">
          <div className="text-[11px] text-text3 mb-1">💡 SUGESTÕES DE USO</div>
          <div className="text-xs text-text2">Aparelho fonador para material de canto · Instrumentos para capas · Cenas históricas (blues, jazz, MPB) · Postura corporal · Sala de aula musical · Sarau</div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-imagem')}>Cancelar</button>
          <button className="btn btn-accent" onClick={() => { closeModal('modal-imagem'); showToast('✨ Imagem sendo gerada via Gemini API...'); }}>
            <Sparkle size={16} /> Gerar com Gemini
          </button>
        </div>
      </Modal>

      {/* Modal Conteúdo */}
      <Modal 
        isOpen={isModalOpen('modal-conteudo')} 
        onClose={() => closeModal('modal-conteudo')}
        title={<>Novo <em className="not-italic text-accent">Bloco de Conteúdo</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Título</label>
            <input className="form-input" placeholder="Ex: Escala Pentatônica Menor" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Universal (Teoria)</option><option>Violão</option><option>Guitarra</option>
              <option>Teclado</option><option>Canto</option><option>Bateria</option><option>Baixo</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Pilar</label>
            <select className="form-select">
              <option>Fundamentos Teóricos</option><option>Prática do Instrumento</option>
              <option>Repertório</option><option>Improvisação e Composição</option>
              <option>Desenvolvimento Auditivo</option><option>Avaliações e Apresentações</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Nível</label>
            <select className="form-select">
              <option>Foundation</option><option>Grow</option><option>Advance</option><option>Master</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tipo de bloco</label>
            <select className="form-select">
              <option>Texto explicativo</option><option>Exercício</option>
              <option>Diagrama de acorde (SVGuitar)</option><option>Notação (VexFlow)</option>
              <option>Tablatura (VexTab)</option><option>Diagrama de escala</option>
              <option>Imagem (IA)</option><option>Dica / Exemplo</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tempo estimado</label>
            <input className="form-input" placeholder="15 min" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Conteúdo</label>
          <textarea className="form-textarea" placeholder="Conteúdo do bloco (texto, dados para renderização, etc.)"></textarea>
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="form-input" placeholder="escala, pentatônica, guitarra, improvisação" />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-conteudo')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-conteudo'); showToast('✅ Bloco salvo como rascunho! Aguardando curadoria N4.'); }}>
            <FloppyDisk size={16} /> Salvar rascunho
          </button>
        </div>
      </Modal>

      {/* Modal Acorde */}
      <Modal 
        isOpen={isModalOpen('modal-acorde')} 
        onClose={() => closeModal('modal-acorde')}
        title={<>Novo <em className="not-italic text-accent">Acorde</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Nome do acorde</label>
            <input className="form-input" placeholder="Ex: Am7, F#m, Bb" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Violão</option><option>Guitarra</option><option>Ukulele</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tipo</label>
            <select className="form-select">
              <option>Aberto</option><option>Pestana</option><option>Jazz</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Dificuldade</label>
            <select className="form-select">
              <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Posição (JSON SVGuitar)</label>
          <textarea className="form-textarea font-mono text-xs min-h-[80px]" placeholder='{"fingers": [[1,2],[2,3,1],[3,2,2]], "barres": []}'></textarea>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-acorde')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-acorde'); showToast('✅ Acorde salvo na biblioteca!'); }}>
            <FloppyDisk size={16} /> Salvar
          </button>
        </div>
      </Modal>

      {/* Modal Add Block */}
      <Modal 
        isOpen={isModalOpen('modal-add-block')} 
        onClose={() => closeModal('modal-add-block')}
        title={<>Adicionar <em className="not-italic text-accent">Bloco</em></>}
      >
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Bloco de texto adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><Article size={16} /></div>
              <div><div className="font-bold text-xs">Texto</div><div className="text-[11px] text-text3">Parágrafo editável</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Título adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--foundation-soft)', color:'var(--foundation)'}}><TextAa size={16} /></div>
              <div><div className="font-bold text-xs">Título de Seção</div><div className="text-[11px] text-text3">Cabeçalho colorido</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Imagem adicionada!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--accent-soft)', color:'var(--accent)'}}><ImageIcon size={16} /></div>
              <div><div className="font-bold text-xs">Imagem</div><div className="text-[11px] text-text3">Upload ou Gemini IA</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Diagrama adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--grow-soft)', color:'var(--grow)'}}><Guitar size={16} /></div>
              <div><div className="font-bold text-xs">Diagrama de Acorde</div><div className="text-[11px] text-text3">SVGuitar renderizado</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Notação adicionada!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--master-soft)', color:'var(--master)'}}><MusicNotesSimple size={16} /></div>
              <div><div className="font-bold text-xs">Notação Musical</div><div className="text-[11px] text-text3">VexFlow na pauta</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Tablatura adicionada!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><ListNumbers size={16} /></div>
              <div><div className="font-bold text-xs">Tablatura</div><div className="text-[11px] text-text3">VexTab</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Exercício adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--advance-soft)', color:'var(--advance)'}}><Barbell size={16} /></div>
              <div><div className="font-bold text-xs">Exercício</div><div className="text-[11px] text-text3">Prática dirigida</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Repertório adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--dourado-soft)', color:'var(--dourado)'}}><MusicNote size={16} /></div>
              <div><div className="font-bold text-xs">Ficha de Repertório</div><div className="text-[11px] text-text3">Música + acordes</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Dica adicionada!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--dourado-soft)', color:'var(--dourado)'}}><Lightbulb size={16} /></div>
              <div><div className="font-bold text-xs">Dica / Destaque</div><div className="text-[11px] text-text3">Box informativo</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Selo adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--verde-soft)', color:'var(--verde)'}}><Trophy size={16} /></div>
              <div><div className="font-bold text-xs">Selo / Conquista</div><div className="text-[11px] text-text3">Badge gamificação</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ QR Code adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><QrCode size={16} /></div>
              <div><div className="font-bold text-xs">QR Code</div><div className="text-[11px] text-text3">Link externo</div></div>
            </div>
          </div>
          <div style={{padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'var(--transition)'}} onClick={() => { closeModal('modal-add-block'); showToast('✅ Separador adicionado!'); }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div className="block-type-icon" style={{background:'var(--bg2)', color:'var(--text3)'}}><Minus size={16} /></div>
              <div><div className="font-bold text-xs">Separador</div><div className="text-[11px] text-text3">Linha divisória</div></div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Trocar Imagem */}
      <Modal 
        isOpen={isModalOpen('modal-trocar-imagem')} 
        onClose={() => closeModal('modal-trocar-imagem')}
        title={<>Trocar <em className="not-italic text-accent">Imagem</em></>}
      >
        <div className="flex gap-2 mb-4">
          <div className="px-3 py-1.5 bg-azul-soft text-azul-claro rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer">Gerar com IA</div>
          <div className="px-3 py-1.5 text-text2 hover:bg-bg2 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all">Upload</div>
          <div className="px-3 py-1.5 text-text2 hover:bg-bg2 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all">Biblioteca</div>
        </div>
        <div className="form-group">
          <label className="form-label">Descreva a imagem</label>
          <textarea className="form-textarea" placeholder="Ex: Diagrama didático mostrando as partes do violão clássico com setas indicando: corpo, braço, mão, trastes, cordas, boca, cavalete. Estilo clean, fundo branco, para material didático."></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Estilo</label>
            <select className="form-select">
              <option>Diagrama didático</option><option>Foto realista</option><option>Ilustração</option><option>Artístico</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Resolução</label>
            <select className="form-select">
              <option>512x512</option><option>1024x1024</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-trocar-imagem')}>Cancelar</button>
          <button className="btn btn-accent" onClick={() => { closeModal('modal-trocar-imagem'); showToast('✨ Imagem gerada e substituída!'); }}>
            <Sparkle size={16} /> Gerar com Gemini
          </button>
        </div>
      </Modal>

      {/* Modal Trocar Acorde */}
      <Modal 
        isOpen={isModalOpen('modal-trocar-acorde')} 
        onClose={() => closeModal('modal-trocar-acorde')}
        title={<>Trocar <em className="not-italic text-accent">Acorde</em></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Acorde</label>
            <select className="form-select">
              <option>G (Sol Maior)</option><option>C (Dó Maior)</option><option>D (Ré Maior)</option><option>E (Mi Maior)</option><option>A (Lá Maior)</option><option>Am (Lá menor)</option><option>Em (Mi menor)</option><option>F (Fá Maior)</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Posição</label>
            <select className="form-select">
              <option>Aberta (padrão)</option><option>Pestana 3ª casa</option><option>Pestana 5ª casa</option>
            </select>
          </div>
        </div>
        <div style={{width:'120px', height:'150px', border:'1px solid var(--border)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', margin:'0 auto 16px'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'9px', color:'var(--text3)'}}>SVGuitar Preview</div>
            <div style={{fontSize:'28px', margin:'4px 0'}}>G</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => closeModal('modal-trocar-acorde')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { closeModal('modal-trocar-acorde'); showToast('✅ Acorde atualizado!'); }}>
            <FloppyDisk size={16} /> Aplicar
          </button>
        </div>
      </Modal>
    </>
  );
}
