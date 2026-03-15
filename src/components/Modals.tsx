import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '../AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FloppyDisk, Sparkle, Article, TextAa, Image as ImageIcon, Guitar, 
  MusicNotesSimple, ListNumbers, Barbell, MusicNote, Lightbulb, Trophy, QrCode, Minus, Trash 
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTopic } from '@/services/contentService';
import { createChord, updateChord, deleteChord } from '@/services/libraryService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { createAchievement } from '@/services/achievementService';
import { createTemplate } from '@/services/whatsappService';
import { ChordEditor, createEmptyState, stateToPositions, positionsToState, getStringCount, type ChordEditorState, type ChordInstrument } from '@/components/music/ChordEditor';
import type { Chord } from '@/services/libraryService';

export function Modals() {
  const { isModalOpen, closeModal, getModalData } = useAppContext();
  const { user } = useAuth();

  // Conteúdo form state
  const [topicForm, setTopicForm] = useState({ title: '', instrument: '', pillar: '', difficulty_level: '', estimated_minutes: '15' });
  const [topicSaving, setTopicSaving] = useState(false);

  const handleCreateTopic = async () => {
    if (!topicForm.title.trim()) { toast.error('Informe o título'); return; }
    const slug = topicForm.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    setTopicSaving(true);
    try {
      await createTopic({
        title: topicForm.title,
        slug,
        instrument: topicForm.instrument || 'universal',
        pillar: (topicForm.pillar || null) as any,
        difficulty_level: (topicForm.difficulty_level || 'foundation') as any,
        estimated_minutes: parseInt(topicForm.estimated_minutes) || 15,
      });
      toast.success('Tópico de conteúdo criado!');
      closeModal('modal-conteudo');
      setTopicForm({ title: '', instrument: '', pillar: '', difficulty_level: '', estimated_minutes: '15' });
    } catch (e: any) { toast.error(e?.message || 'Erro ao criar tópico'); }
    finally { setTopicSaving(false); }
  };

  // Acorde form state — editor visual
  const [chordName, setChordName] = useState('');
  const [chordInstrument, setChordInstrument] = useState('guitar');
  const [chordDifficulty, setChordDifficulty] = useState('1');
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyState());
  const [chordStartFret, setChordStartFret] = useState(1);
  const [chordSaving, setChordSaving] = useState(false);
  const [chordDeleting, setChordDeleting] = useState(false);
  const [editingChordId, setEditingChordId] = useState<string | null>(null);

  // Detectar modo edição: quando o modal abre com dados de um acorde existente
  const editChordData = getModalData<Chord>('modal-acorde');
  useEffect(() => {
    if (editChordData && isModalOpen('modal-acorde')) {
      setChordName(editChordData.name);
      setChordInstrument(editChordData.instrument ?? 'guitar');
      setChordDifficulty(String(editChordData.difficulty ?? 1));
      setEditingChordId(editChordData.id);
      const pos = (editChordData.positions ?? { fingers: [], barres: [], muted: [] }) as any;
      // Detectar startFret a partir dos fingers existentes
      const frets = [...(pos.fingers ?? []).map((f: any) => f[1]).filter((f: number) => f > 0), ...(pos.barres ?? []).map((b: any) => b.fret)];
      const minFret = frets.length > 0 ? Math.min(...frets) : 1;
      const sf = minFret > 0 ? minFret : 1;
      setChordStartFret(sf);
      const inst = (editChordData.instrument ?? 'guitar') as ChordInstrument
      setChordEditorState(positionsToState(pos, sf, inst));
    }
  }, [editChordData, isModalOpen]);

  const handleSaveChord = async () => {
    if (!chordName.trim()) { toast.error('Informe o nome do acorde'); return; }
    setChordSaving(true);
    try {
      const positions = stateToPositions(chordEditorState, chordStartFret, chordInstrument as ChordInstrument);
      if (editingChordId) {
        await updateChord(editingChordId, {
          name: chordName,
          instrument: chordInstrument as any,
          difficulty: parseInt(chordDifficulty) || 1,
          positions: positions as any,
        });
        toast.success('Acorde atualizado!');
      } else {
        await createChord({
          name: chordName,
          instrument: chordInstrument as any,
          difficulty: parseInt(chordDifficulty) || 1,
          positions: positions as any,
        });
        toast.success('Acorde salvo na biblioteca!');
      }
      closeModal('modal-acorde');
      resetChordEditor();
      window.dispatchEvent(new Event('chord-library-updated'));
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar acorde'); }
    finally { setChordSaving(false); }
  };

  const handleDeleteChord = async () => {
    if (!editingChordId) return
    setChordDeleting(true)
    try {
      await deleteChord(editingChordId)
      toast.success('Acorde excluído', { description: `O acorde "${chordName}" foi removido da biblioteca.` })
      closeModal('modal-acorde')
      resetChordEditor()
      window.dispatchEvent(new Event('chord-library-updated'))
    } catch (e: any) {
      toast.error('Erro ao excluir', { description: e?.message || 'Não foi possível excluir o acorde.' })
    } finally {
      setChordDeleting(false)
    }
  }

  const resetChordEditor = () => {
    setChordName('');
    setChordInstrument('guitar');
    setChordDifficulty('1');
    setChordEditorState(createEmptyState(6));
    setChordStartFret(1);
    setEditingChordId(null);
  };

  // Conquista form state
  const [achievForm, setAchievForm] = useState({ name: '', description: '', type: 'milestone', points: '100', icon: 'Trophy' });
  const [achievSaving, setAchievSaving] = useState(false);

  const handleCreateAchievement = async () => {
    if (!achievForm.name.trim()) { toast.error('Informe o nome'); return; }
    setAchievSaving(true);
    try {
      await createAchievement({
        name: achievForm.name,
        description: achievForm.description || null,
        type: achievForm.type as any,
        points: parseInt(achievForm.points) || 0,
        icon: achievForm.icon || 'Trophy',
      });
      toast.success('Conquista criada!');
      closeModal('modal-conquista');
      setAchievForm({ name: '', description: '', type: 'milestone', points: '100', icon: 'Trophy' });
    } catch (e: any) { toast.error(e?.message || 'Erro ao criar conquista'); }
    finally { setAchievSaving(false); }
  };

  // Template WhatsApp form state
  const [tplForm, setTplForm] = useState({ name: '', trigger_type: 'manual', message_body: '' });
  const [tplSaving, setTplSaving] = useState(false);

  const handleCreateTemplate = async () => {
    if (!tplForm.name.trim()) { toast.error('Informe o nome'); return; }
    const schoolId = user?.user_metadata?.school_id;
    if (!schoolId) { toast.error('Escola não identificada'); return; }
    setTplSaving(true);
    try {
      await createTemplate({
        school_id: schoolId,
        name: tplForm.name,
        trigger_type: tplForm.trigger_type as any,
        message_body: tplForm.message_body || '',
      });
      toast.success('Template salvo!');
      closeModal('modal-template');
      setTplForm({ name: '', trigger_type: 'manual', message_body: '' });
    } catch (e: any) { toast.error(e?.message || 'Erro ao criar template'); }
    finally { setTplSaving(false); }
  };

  return (
    <>
      {/* Modal Conquista — CRUD real */}
      <Dialog open={isModalOpen('modal-conquista')} onOpenChange={() => closeModal('modal-conquista')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Nova <span className="text-accent">Conquista</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Primeiro Acorde" value={achievForm.name} onChange={e => setAchievForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Tocou o primeiro acorde" value={achievForm.description} onChange={e => setAchievForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={achievForm.type} onValueChange={v => setAchievForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">Milestone</SelectItem><SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="streak">Streak</SelectItem><SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pontos</Label>
              <Input type="number" value={achievForm.points} onChange={e => setAchievForm(p => ({ ...p, points: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-conquista')} disabled={achievSaving}>Cancelar</Button>
            <Button onClick={handleCreateAchievement} disabled={achievSaving}>
              <FloppyDisk size={16} /> {achievSaving ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Template — CRUD real */}
      <Dialog open={isModalOpen('modal-template')} onOpenChange={() => closeModal('modal-template')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Template</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Falta consecutiva" value={tplForm.name} onChange={e => setTplForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select value={tplForm.trigger_type} onValueChange={v => setTplForm(p => ({ ...p, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem><SelectItem value="absence">Falta detectada</SelectItem>
                  <SelectItem value="checkpoint">Checkpoint completo</SelectItem><SelectItem value="scheduled">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Mensagem</Label>
            <Textarea placeholder="Oi {aluno}! Preparei um material pra você não ficar pra trás 🎸" value={tplForm.message_body} onChange={e => setTplForm(p => ({ ...p, message_body: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-template')} disabled={tplSaving}>Cancelar</Button>
            <Button onClick={handleCreateTemplate} disabled={tplSaving}>
              <FloppyDisk size={16} /> {tplSaving ? 'Salvando...' : 'Salvar'}
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
            <Button className="bg-accent hover:bg-accent/90" onClick={() => { closeModal('modal-imagem'); toast.info('Imagem sendo gerada via Gemini API...'); }}>
              <Sparkle size={16} /> Gerar com Gemini
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Conteúdo — CRUD real */}
      <Dialog open={isModalOpen('modal-conteudo')} onOpenChange={() => closeModal('modal-conteudo')}>
        <DialogContent className="sm:max-w-[640px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">Novo <span className="text-accent">Tópico de Conteúdo</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input placeholder="Ex: Escala Pentatônica Menor" value={topicForm.title} onChange={e => setTopicForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select value={topicForm.instrument} onValueChange={v => setTopicForm(p => ({ ...p, instrument: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal">Universal (Teoria)</SelectItem><SelectItem value="Violão">Violão</SelectItem>
                  <SelectItem value="Guitarra">Guitarra</SelectItem><SelectItem value="Teclado">Teclado</SelectItem>
                  <SelectItem value="Canto">Canto</SelectItem><SelectItem value="Bateria">Bateria</SelectItem>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pilar</Label>
              <Select value={topicForm.pillar} onValueChange={v => setTopicForm(p => ({ ...p, pillar: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
              <Select value={topicForm.difficulty_level} onValueChange={v => setTopicForm(p => ({ ...p, difficulty_level: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem><SelectItem value="grow">Grow</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem><SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tempo estimado (min)</Label>
              <Input type="number" value={topicForm.estimated_minutes} onChange={e => setTopicForm(p => ({ ...p, estimated_minutes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => closeModal('modal-conteudo')} disabled={topicSaving}>Cancelar</Button>
            <Button onClick={handleCreateTopic} disabled={topicSaving}>
              <FloppyDisk size={16} /> {topicSaving ? 'Salvando...' : 'Criar Tópico'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Acorde — Editor Visual */}
      <Dialog open={isModalOpen('modal-acorde')} onOpenChange={() => { closeModal('modal-acorde'); resetChordEditor(); }}>
        <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto bg-surface border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">{editingChordId ? 'Editar' : 'Novo'} <span className="text-accent">Acorde</span></DialogTitle>
          </DialogHeader>

          {/* Campos: nome, instrumento, dificuldade, traste inicial */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>Nome do acorde</Label>
              <Input placeholder="Ex: Am7, F#m" value={chordName} onChange={e => setChordName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select value={chordInstrument} onValueChange={(v) => {
                setChordInstrument(v)
                setChordEditorState(createEmptyState(getStringCount(v as ChordInstrument)))
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guitar">Violão</SelectItem>
                  <SelectItem value="ukulele">Ukulele</SelectItem>
                  <SelectItem value="bass">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dificuldade</Label>
              <Select value={chordDifficulty} onValueChange={setChordDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem><SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Traste inicial</Label>
              <Select value={String(chordStartFret)} onValueChange={v => setChordStartFret(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(f => (
                    <SelectItem key={f} value={String(f)}>{f}ª casa</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Editor visual do braço + preview */}
          <ChordEditor
            state={chordEditorState}
            onChange={setChordEditorState}
            chordName={chordName}
            startFret={chordStartFret}
            instrument={chordInstrument as ChordInstrument}
          />

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
            {editingChordId ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={chordDeleting} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash size={16} /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-surface border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir acorde?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O acorde "{chordName}" será removido permanentemente da biblioteca. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={chordDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDeleteChord}
                      disabled={chordDeleting}
                    >
                      {chordDeleting ? 'Excluindo...' : 'Sim, excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { closeModal('modal-acorde'); resetChordEditor(); }} disabled={chordSaving || chordDeleting}>Cancelar</Button>
              <Button onClick={handleSaveChord} disabled={chordSaving || chordDeleting}>
                <FloppyDisk size={16} /> {chordSaving ? 'Salvando...' : (editingChordId ? 'Atualizar' : 'Salvar')}
              </Button>
            </div>
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
                  onClick={() => { closeModal('modal-add-block'); toast.success(block.msg); }}
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
            <Button className="bg-accent hover:bg-accent/90" onClick={() => { closeModal('modal-trocar-imagem'); toast.success('Imagem gerada e substituída!'); }}>
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
            <Button onClick={() => { closeModal('modal-trocar-acorde'); toast.success('Acorde atualizado!'); }}>
              <FloppyDisk size={16} /> Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
