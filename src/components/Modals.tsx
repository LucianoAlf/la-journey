import { useAppContext } from '../AppContext';
import { 
  FloppyDisk, Sparkle, Article, TextAa, Image as ImageIcon, Guitar, 
  MusicNotesSimple, ListNumbers, Barbell, MusicNote, Lightbulb, Trophy, QrCode, Minus 
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Modals() {
  const { isModalOpen, closeModal, showToast } = useAppContext();

  return (
    <>
      {/* Modal Jornada */}
      <Dialog open={isModalOpen('modal-jornada')} onOpenChange={() => closeModal('modal-jornada')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Nova <span className="text-accent">Jornada</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Jornada Violão Adulto" />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                  <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="piano">Piano</SelectItem>
                  <SelectItem value="canto">Canto</SelectItem><SelectItem value="bateria">Bateria</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem><SelectItem value="ukulele">Ukulele</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Público-alvo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adulto</SelectItem><SelectItem value="teen">Teen</SelectItem>
                  <SelectItem value="kids">Kids</SelectItem><SelectItem value="baby">Baby</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aulas por Stage</Label>
              <Select defaultValue="40"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 bg-azul-soft rounded-[var(--radius-sm)] mb-4">
            <div className="text-[11px] text-text3 mb-2">⚓ METODOLOGIA</div>
            <div className="text-[13px] text-text2">Ancoragem de Fundamentos — cada conteúdo vivenciado, fixado e celebrado antes de avançar.</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-jornada')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-jornada'); showToast('✅ Jornada criada!'); }}>
              <FloppyDisk size={16} /> Criar Jornada
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Aluno */}
      <Dialog open={isModalOpen('modal-aluno')} onOpenChange={() => closeModal('modal-aluno')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Aluno</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input placeholder="Nome do aluno" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input placeholder="(21) 99999-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                  <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="canto">Canto</SelectItem>
                  <SelectItem value="bateria">Bateria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="t1">Violão Adulto — Seg/Qua</SelectItem>
                  <SelectItem value="t2">Guitarra Rock — Ter/Qui</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input placeholder="Nome do responsável" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp responsável</Label>
              <Input placeholder="(21) 99999-0000" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-aluno')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-aluno'); showToast('✅ Aluno cadastrado!'); }}>
              <FloppyDisk size={16} /> Cadastrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Música */}
      <Dialog open={isModalOpen('modal-musica')} onOpenChange={() => closeModal('modal-musica')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Nova <span className="text-accent">Música</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input placeholder="Nome da música" />
            </div>
            <div className="space-y-1.5">
              <Label>Artista</Label>
              <Input placeholder="Nome do artista" />
            </div>
            <div className="space-y-1.5">
              <Label>Tonalidade</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem><SelectItem value="G">G</SelectItem>
                  <SelectItem value="A">A</SelectItem><SelectItem value="Am">Am</SelectItem><SelectItem value="Em">Em</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gênero</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rock">Rock</SelectItem><SelectItem value="mpb">MPB</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem><SelectItem value="reggae">Reggae</SelectItem>
                  <SelectItem value="sertanejo">Sertanejo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dificuldade</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Iniciante</SelectItem><SelectItem value="2">2 - Fácil</SelectItem>
                  <SelectItem value="3">3 - Médio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Acordes</Label>
              <Input placeholder="C, G, Am, F" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-musica')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-musica'); showToast('✅ Música adicionada!'); }}>
              <FloppyDisk size={16} /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Conquista */}
      <Dialog open={isModalOpen('modal-conquista')} onOpenChange={() => closeModal('modal-conquista')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Nova <span className="text-accent">Conquista</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Primeiro Acorde" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Tocou o primeiro acorde" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">Milestone</SelectItem><SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="streak">Streak</SelectItem><SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pontos</Label>
              <Input placeholder="100" type="number" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-conquista')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-conquista'); showToast('✅ Conquista criada!'); }}>
              <FloppyDisk size={16} /> Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Template */}
      <Dialog open={isModalOpen('modal-template')} onOpenChange={() => closeModal('modal-template')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Template</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Falta consecutiva" />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem><SelectItem value="absence">Falta detectada</SelectItem>
                  <SelectItem value="checkpoint">Checkpoint completo</SelectItem><SelectItem value="scheduled">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Mensagem</Label>
            <Textarea placeholder="Oi {aluno}! Preparei um material pra você não ficar pra trás 🎸" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-template')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-template'); showToast('✅ Template salvo!'); }}>
              <FloppyDisk size={16} /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Turma */}
      <Dialog open={isModalOpen('modal-turma')} onOpenChange={() => closeModal('modal-turma')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Nova <span className="text-accent">Turma</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome da turma</Label>
              <Input placeholder="Violão Adulto — Seg/Qua 19h" />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento / Disciplina</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="violao">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                  <SelectItem value="teclado">Teclado</SelectItem><SelectItem value="piano">Piano</SelectItem>
                  <SelectItem value="canto">Canto</SelectItem><SelectItem value="bateria">Bateria</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem><SelectItem value="ukulele">Ukulele</SelectItem>
                  <SelectItem value="musicalizacao-baby">Musicalização (Baby)</SelectItem>
                  <SelectItem value="musicalizacao-kids">Musicalização (Kids)</SelectItem>
                  <SelectItem value="iniciacao-heart">Iniciação (Heart)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="renan">Renan</SelectItem><SelectItem value="kinho">Kinho</SelectItem>
                  <SelectItem value="peterson">Peterson</SelectItem><SelectItem value="jeyson">Jeyson</SelectItem>
                  <SelectItem value="juliana">Juliana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jornada vinculada</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="violao-adulto">Violão Adulto Padrão</SelectItem>
                  <SelectItem value="guitarra-rock">Guitarra Rock</SelectItem>
                  <SelectItem value="canto-popular">Canto Popular</SelectItem>
                  <SelectItem value="teclado-ini">Teclado Iniciante</SelectItem>
                  <SelectItem value="baby-class">Baby Class</SelectItem>
                  <SelectItem value="kids">Kids</SelectItem><SelectItem value="heart">Heart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input placeholder="Seg/Qua 19:00" />
            </div>
            <div className="space-y-1.5">
              <Label>Max. alunos</Label>
              <Input placeholder="10" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="campo-grande">Campo Grande</SelectItem>
                  <SelectItem value="recreio">Recreio</SelectItem><SelectItem value="barra">Barra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-turma')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-turma'); showToast('✅ Turma criada!'); }}>
              <FloppyDisk size={16} /> Criar Turma
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Imagem IA */}
      <Dialog open={isModalOpen('modal-imagem')} onOpenChange={() => closeModal('modal-imagem')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Gerar <span className="text-accent">Imagem IA</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 mb-4">
            <Label>Descrição da imagem</Label>
            <Textarea placeholder="Ex: Foto profissional de um violão clássico sobre fundo escuro, iluminação lateral suave, estilo editorial para material didático musical" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foto">Fotográfico (realista)</SelectItem>
                  <SelectItem value="ilustracao">Ilustração didática</SelectItem>
                  <SelectItem value="diagrama">Diagrama técnico</SelectItem>
                  <SelectItem value="artistico">Artístico / Editorial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resolução</Label>
              <Select defaultValue="512"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="512">512x512</SelectItem><SelectItem value="1024">1024x1024</SelectItem>
                  <SelectItem value="768x512">768x512 (paisagem)</SelectItem><SelectItem value="512x768">512x768 (retrato)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3.5 bg-azul-soft rounded-[var(--radius-sm)] mb-4">
            <div className="text-[11px] text-text3 mb-1">💡 SUGESTÕES DE USO</div>
            <div className="text-xs text-text2">Aparelho fonador para material de canto · Instrumentos para capas · Cenas históricas (blues, jazz, MPB) · Postura corporal · Sala de aula musical · Sarau</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-imagem')}>Cancelar</Button>
            <Button className="bg-accent hover:bg-accent/90" onClick={() => { closeModal('modal-imagem'); showToast('✨ Imagem sendo gerada via Gemini API...'); }}>
              <Sparkle size={16} /> Gerar com Gemini
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Conteúdo */}
      <Dialog open={isModalOpen('modal-conteudo')} onOpenChange={() => closeModal('modal-conteudo')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Bloco de Conteúdo</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input placeholder="Ex: Escala Pentatônica Menor" />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal">Universal (Teoria)</SelectItem><SelectItem value="violao">Violão</SelectItem>
                  <SelectItem value="guitarra">Guitarra</SelectItem><SelectItem value="teclado">Teclado</SelectItem>
                  <SelectItem value="canto">Canto</SelectItem><SelectItem value="bateria">Bateria</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pilar</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="theoretical_foundations">Fundamentos Teóricos</SelectItem>
                  <SelectItem value="instrument_practice">Prática do Instrumento</SelectItem>
                  <SelectItem value="repertoire">Repertório</SelectItem>
                  <SelectItem value="improvisation_composition">Improvisação e Composição</SelectItem>
                  <SelectItem value="auditory_development">Desenvolvimento Auditivo</SelectItem>
                  <SelectItem value="evaluations_presentations">Avaliações e Apresentações</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem><SelectItem value="grow">Grow</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem><SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de bloco</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto explicativo</SelectItem><SelectItem value="exercise">Exercício</SelectItem>
                  <SelectItem value="chord_diagram">Diagrama de acorde (SVGuitar)</SelectItem>
                  <SelectItem value="notation">Notação (VexFlow)</SelectItem>
                  <SelectItem value="tablature">Tablatura (VexTab)</SelectItem>
                  <SelectItem value="scale_diagram">Diagrama de escala</SelectItem>
                  <SelectItem value="image">Imagem (IA)</SelectItem><SelectItem value="tip">Dica / Exemplo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tempo estimado</Label>
              <Input placeholder="15 min" />
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Conteúdo</Label>
            <Textarea placeholder="Conteúdo do bloco (texto, dados para renderização, etc.)" />
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Tags</Label>
            <Input placeholder="escala, pentatônica, guitarra, improvisação" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-conteudo')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-conteudo'); showToast('✅ Bloco salvo como rascunho! Aguardando curadoria N4.'); }}>
              <FloppyDisk size={16} /> Salvar rascunho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Acorde */}
      <Dialog open={isModalOpen('modal-acorde')} onOpenChange={() => closeModal('modal-acorde')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Acorde</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome do acorde</Label>
              <Input placeholder="Ex: Am7, F#m, Bb" />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guitar">Violão</SelectItem><SelectItem value="guitarra">Guitarra</SelectItem>
                  <SelectItem value="ukulele">Ukulele</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem><SelectItem value="pestana">Pestana</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dificuldade</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem><SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Posição (JSON SVGuitar)</Label>
            <Textarea className="font-mono text-xs min-h-[80px]" placeholder='{"fingers": [[1,2],[2,3,1],[3,2,2]], "barres": []}' />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-acorde')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-acorde'); showToast('✅ Acorde salvo na biblioteca!'); }}>
              <FloppyDisk size={16} /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Add Block */}
      <Dialog open={isModalOpen('modal-add-block')} onOpenChange={() => closeModal('modal-add-block')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Adicionar <span className="text-accent">Bloco</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Article, label: 'Texto', desc: 'Parágrafo editável', bg: 'bg-azul-soft', color: 'text-azul-claro', msg: '✅ Bloco de texto adicionado!' },
              { icon: TextAa, label: 'Título de Seção', desc: 'Cabeçalho colorido', bg: 'bg-foundation-soft', color: 'text-foundation', msg: '✅ Título adicionado!' },
              { icon: ImageIcon, label: 'Imagem', desc: 'Upload ou Gemini IA', bg: 'bg-accent-soft', color: 'text-accent', msg: '✅ Imagem adicionada!' },
              { icon: Guitar, label: 'Diagrama de Acorde', desc: 'SVGuitar renderizado', bg: 'bg-grow-soft', color: 'text-grow', msg: '✅ Diagrama adicionado!' },
              { icon: MusicNotesSimple, label: 'Notação Musical', desc: 'VexFlow na pauta', bg: 'bg-master-soft', color: 'text-master', msg: '✅ Notação adicionada!' },
              { icon: ListNumbers, label: 'Tablatura', desc: 'VexTab', bg: 'bg-azul-soft', color: 'text-azul-claro', msg: '✅ Tablatura adicionada!' },
              { icon: Barbell, label: 'Exercício', desc: 'Prática dirigida', bg: 'bg-advance-soft', color: 'text-advance', msg: '✅ Exercício adicionado!' },
              { icon: MusicNote, label: 'Ficha de Repertório', desc: 'Música + acordes', bg: 'bg-dourado-soft', color: 'text-dourado', msg: '✅ Repertório adicionado!' },
              { icon: Lightbulb, label: 'Dica / Destaque', desc: 'Box informativo', bg: 'bg-dourado-soft', color: 'text-dourado', msg: '✅ Dica adicionada!' },
              { icon: Trophy, label: 'Selo / Conquista', desc: 'Badge gamificação', bg: 'bg-verde-soft', color: 'text-verde', msg: '✅ Selo adicionado!' },
              { icon: QrCode, label: 'QR Code', desc: 'Link externo', bg: 'bg-azul-soft', color: 'text-azul-claro', msg: '✅ QR Code adicionado!' },
              { icon: Minus, label: 'Separador', desc: 'Linha divisória', bg: 'bg-bg2', color: 'text-text3', msg: '✅ Separador adicionado!' },
            ].map((block) => {
              const Icon = block.icon
              return (
                <div
                  key={block.label}
                  className="p-3.5 border border-border rounded-[var(--radius-sm)] cursor-pointer transition-all hover:bg-azul-soft hover:border-azul-claro/20"
                  onClick={() => { closeModal('modal-add-block'); showToast(block.msg); }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${block.bg} ${block.color} flex items-center justify-center`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{block.label}</div>
                      <div className="text-[11px] text-text3">{block.desc}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Trocar Imagem */}
      <Dialog open={isModalOpen('modal-trocar-imagem')} onOpenChange={() => closeModal('modal-trocar-imagem')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Trocar <span className="text-accent">Imagem</span></DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant="secondary" size="sm">Gerar com IA</Button>
            <Button variant="ghost" size="sm">Upload</Button>
            <Button variant="ghost" size="sm">Biblioteca</Button>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Descreva a imagem</Label>
            <Textarea placeholder="Ex: Diagrama didático mostrando as partes do violão clássico com setas indicando: corpo, braço, mão, trastes, cordas, boca, cavalete. Estilo clean, fundo branco, para material didático." />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagrama">Diagrama didático</SelectItem><SelectItem value="foto">Foto realista</SelectItem>
                  <SelectItem value="ilustracao">Ilustração</SelectItem><SelectItem value="artistico">Artístico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resolução</Label>
              <Select defaultValue="512"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="512">512x512</SelectItem><SelectItem value="1024">1024x1024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-trocar-imagem')}>Cancelar</Button>
            <Button className="bg-accent hover:bg-accent/90" onClick={() => { closeModal('modal-trocar-imagem'); showToast('✨ Imagem gerada e substituída!'); }}>
              <Sparkle size={16} /> Gerar com Gemini
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Trocar Acorde */}
      <Dialog open={isModalOpen('modal-trocar-acorde')} onOpenChange={() => closeModal('modal-trocar-acorde')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Trocar <span className="text-accent">Acorde</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Acorde</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="G">G (Sol Maior)</SelectItem><SelectItem value="C">C (Dó Maior)</SelectItem>
                  <SelectItem value="D">D (Ré Maior)</SelectItem><SelectItem value="E">E (Mi Maior)</SelectItem>
                  <SelectItem value="A">A (Lá Maior)</SelectItem><SelectItem value="Am">Am (Lá menor)</SelectItem>
                  <SelectItem value="Em">Em (Mi menor)</SelectItem><SelectItem value="F">F (Fá Maior)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Posição</Label>
              <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta (padrão)</SelectItem>
                  <SelectItem value="pestana3">Pestana 3ª casa</SelectItem>
                  <SelectItem value="pestana5">Pestana 5ª casa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-[120px] h-[150px] border border-border rounded-lg flex items-center justify-center bg-bg mx-auto mb-4">
            <div className="text-center">
              <div className="text-[9px] text-text3">SVGuitar Preview</div>
              <div className="text-[28px] my-1">G</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-trocar-acorde')}>Cancelar</Button>
            <Button onClick={() => { closeModal('modal-trocar-acorde'); showToast('✅ Acorde atualizado!'); }}>
              <FloppyDisk size={16} /> Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
