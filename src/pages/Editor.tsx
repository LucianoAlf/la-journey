import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";
import { 
  ArrowLeft, FloppyDisk, FilePdf, Image as ImageIcon, TextAa, Article, 
  Guitar, MusicNotesSimple, Metronome, MusicNote, Trophy, QrCode, PlusCircle,
  ArrowUp, ArrowDown, Copy, ArrowCounterClockwise, Trash, Code, WhatsappLogo,
  Plus
} from "@phosphor-icons/react";

export function Editor() {
  const [selectedBlock, setSelectedBlock] = useState(0);
  const { showToast, openModal } = useAppContext();
  const navigate = useNavigate();
  const canvasRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectBlock = (idx: number) => {
    setSelectedBlock(idx);
    const cb = canvasRefs.current[idx];
    if (cb) {
      cb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="editor-layout">
        {/* LEFT: Block List */}
        <div className="editor-sidebar">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
            <div>
              <div className="form-label" style={{color:'var(--accent)', marginBottom:'2px'}}>Editando</div>
              <div className="font-serif" style={{fontSize:'16px'}}>Fundamentos 1</div>
              <div className="text-[11px] text-text3">Violão · Foundation · 10 aulas</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/gerador')}>
              <ArrowLeft size={16} />
            </button>
          </div>
          <div style={{display:'flex', gap:'4px', marginBottom:'12px'}}>
            <button className="btn btn-primary btn-sm" style={{flex:1, justifyContent:'center'}} onClick={() => showToast('✅ Rascunho salvo!')}>
              <FloppyDisk size={16} /> Salvar
            </button>
            <button className="btn btn-accent btn-sm" style={{flex:1, justifyContent:'center'}} onClick={() => showToast('📄 PDF exportado!')}>
              <FilePdf size={16} /> PDF
            </button>
          </div>
          <div className="form-label mb-2">Blocos do material</div>
          <div id="block-list">
            <div className={`block-item ${selectedBlock === 0 ? 'selected' : ''}`} onClick={() => selectBlock(0)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><ImageIcon size={16} /></div>
                <div><div className="font-bold text-xs">Capa</div><div className="text-[11px] text-text3">Logo + título + info</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()} title="Remover">✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 1 ? 'selected' : ''}`} onClick={() => selectBlock(1)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--foundation-soft)', color:'var(--foundation)'}}><TextAa size={16} /></div>
                <div><div className="font-bold text-xs">Título da seção</div><div className="text-[11px] text-text3">Teoria e Conceitos</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 2 ? 'selected' : ''}`} onClick={() => selectBlock(2)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><Article size={16} /></div>
                <div><div className="font-bold text-xs">Texto</div><div className="text-[11px] text-text3">Anatomia do instrumento</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 3 ? 'selected' : ''}`} onClick={() => selectBlock(3)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--accent-soft)', color:'var(--accent)'}}><ImageIcon size={16} /></div>
                <div><div className="font-bold text-xs">Imagem IA</div><div className="text-[11px] text-text3">Partes do violão</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 4 ? 'selected' : ''}`} onClick={() => selectBlock(4)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><Article size={16} /></div>
                <div><div className="font-bold text-xs">Texto</div><div className="text-[11px] text-text3">Postura e posição</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 5 ? 'selected' : ''}`} onClick={() => selectBlock(5)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--foundation-soft)', color:'var(--foundation)'}}><TextAa size={16} /></div>
                <div><div className="font-bold text-xs">Título da seção</div><div className="text-[11px] text-text3">Técnica</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 6 ? 'selected' : ''}`} onClick={() => selectBlock(6)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--grow-soft)', color:'var(--grow)'}}><Guitar size={16} /></div>
                <div><div className="font-bold text-xs">Diagrama de Acorde</div><div className="text-[11px] text-text3">Acorde G (Sol Maior)</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 7 ? 'selected' : ''}`} onClick={() => selectBlock(7)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--grow-soft)', color:'var(--grow)'}}><Guitar size={16} /></div>
                <div><div className="font-bold text-xs">Diagrama de Acorde</div><div className="text-[11px] text-text3">Acorde C (Dó Maior)</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 8 ? 'selected' : ''}`} onClick={() => selectBlock(8)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--advance-soft)', color:'var(--advance)'}}><MusicNotesSimple size={16} /></div>
                <div><div className="font-bold text-xs">Exercício</div><div className="text-[11px] text-text3">Psicomotor 1234</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 9 ? 'selected' : ''}`} onClick={() => selectBlock(9)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--foundation-soft)', color:'var(--foundation)'}}><TextAa size={16} /></div>
                <div><div className="font-bold text-xs">Título da seção</div><div className="text-[11px] text-text3">Ritmo</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 10 ? 'selected' : ''}`} onClick={() => selectBlock(10)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--master-soft)', color:'var(--master)'}}><Metronome size={16} /></div>
                <div><div className="font-bold text-xs">Notação (VexFlow)</div><div className="text-[11px] text-text3">Figuras rítmicas</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 11 ? 'selected' : ''}`} onClick={() => selectBlock(11)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--foundation-soft)', color:'var(--foundation)'}}><TextAa size={16} /></div>
                <div><div className="font-bold text-xs">Título da seção</div><div className="text-[11px] text-text3">Repertório</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 12 ? 'selected' : ''}`} onClick={() => selectBlock(12)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--dourado-soft)', color:'var(--dourado)'}}><MusicNote size={16} /></div>
                <div><div className="font-bold text-xs">Ficha de Repertório</div><div className="text-[11px] text-text3">Love Me Do — Beatles</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 13 ? 'selected' : ''}`} onClick={() => selectBlock(13)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--verde-soft)', color:'var(--verde)'}}><Trophy size={16} /></div>
                <div><div className="font-bold text-xs">Selo / Conquista</div><div className="text-[11px] text-text3">Primeiro Acorde 🎸</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
            <div className={`block-item ${selectedBlock === 14 ? 'selected' : ''}`} onClick={() => selectBlock(14)}>
              <div className="drag-handle">⠿</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'14px'}}>
                <div className="block-type-icon" style={{background:'var(--azul-soft)', color:'var(--azul-claro)'}}><QrCode size={16} /></div>
                <div><div className="font-bold text-xs">QR Code</div><div className="text-[11px] text-text3">Backing track YouTube</div></div>
              </div>
              <div className="block-actions"><button onClick={(e) => e.stopPropagation()}>✕</button></div>
            </div>
          </div>
          <div className="add-block-btn" onClick={() => openModal('modal-add-block')}>
            <Plus size={16} className="inline-block mb-0.5" /> Adicionar bloco
          </div>
          <div style={{padding:'10px', background:'var(--azul-soft)', borderRadius:'var(--radius-sm)', fontSize:'11px', color:'var(--text2)'}}>
            <strong>15 blocos</strong> · Versão 2 · Editado por Alf<br/>
            <span className="text-[11px] text-text3">Última edição: 11/03 às 14:30</span>
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="editor-canvas">
          <div style={{maxWidth:'680px', margin:'0 auto'}}>
            {/* Block 0: Capa */}
            <div className={`canvas-block ${selectedBlock === 0 ? 'selected' : ''}`} onClick={() => selectBlock(0)} ref={el => { canvasRefs.current[0] = el }}>
              <div style={{textAlign:'center', padding:'20px 0'}}>
                <div style={{width:'56px', height:'56px', borderRadius:'14px', background:'linear-gradient(135deg,var(--azul-escuro),var(--azul))', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontWeight:800}}>LA</div>
                <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:'var(--text3)'}}>LA Music School</div>
                <div contentEditable className="font-serif" style={{fontSize:'28px', margin:'16px 0 4px', color:'var(--text)'}}>Fundamentos 1</div>
                <div style={{fontSize:'13px', color:'var(--text3)'}}>Violão · Foundation · 10 Aulas</div>
                <div style={{marginTop:'16px', display:'flex', justifyContent:'center', gap:'8px'}}>
                  <span className="badge badge-foundation">Foundation</span>
                  <span className="badge badge-azul">Violão Adulto</span>
                </div>
              </div>
            </div>

            {/* Block 1: Section Title */}
            <div className={`canvas-block ${selectedBlock === 1 ? 'selected' : ''}`} onClick={() => selectBlock(1)} ref={el => { canvasRefs.current[1] = el }}>
              <div contentEditable className="font-serif" style={{fontSize:'20px', color:'var(--foundation)', borderLeft:'3px solid var(--foundation)', paddingLeft:'12px'}}>📖 Teoria e Conceitos</div>
            </div>

            {/* Block 2: Text */}
            <div className={`canvas-block ${selectedBlock === 2 ? 'selected' : ''}`} onClick={() => selectBlock(2)} ref={el => { canvasRefs.current[2] = el }}>
              <div style={{fontSize:'14px', fontWeight:600, color:'var(--text)', marginBottom:'8px'}} contentEditable>Anatomia do Violão</div>
              <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8}}>O violão é composto por três partes principais: <strong>corpo</strong> (caixa de ressonância), <strong>braço</strong> (onde ficam os trastes e as casas) e <strong>mão</strong> ou cabeça (onde ficam as tarraxas para afinação). As 6 cordas são numeradas de baixo para cima: 1ª (mi agudo) até 6ª (mi grave). Os trastes dividem o braço em casas, e cada casa equivale a meio tom.</div>
            </div>

            {/* Block 3: Image */}
            <div className={`canvas-block ${selectedBlock === 3 ? 'selected' : ''}`} onClick={() => selectBlock(3)} ref={el => { canvasRefs.current[3] = el }}>
              <div style={{aspectRatio:'16/9', background:'linear-gradient(135deg,var(--azul-soft),var(--accent-soft))', borderRadius:'var(--radius-sm)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer'}} onClick={() => openModal('modal-trocar-imagem')}>
                <ImageIcon size={36} style={{color:'var(--text3)', marginBottom:'8px'}} />
                <div style={{fontSize:'12px', color:'var(--text3)'}}>Imagem: Partes do Violão</div>
                <div style={{fontSize:'10px', color:'var(--text3)', marginTop:'4px'}}>Clique para trocar · Gemini IA ou Upload</div>
              </div>
            </div>

            {/* Block 4: Text */}
            <div className={`canvas-block ${selectedBlock === 4 ? 'selected' : ''}`} onClick={() => selectBlock(4)} ref={el => { canvasRefs.current[4] = el }}>
              <div style={{fontSize:'14px', fontWeight:600, color:'var(--text)', marginBottom:'8px'}} contentEditable>Postura e Posição das Mãos</div>
              <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8}}>A postura correta é fundamental para evitar lesões e facilitar a execução. Sente-se com a coluna ereta, o violão apoiado na perna direita (posição popular) ou esquerda (posição clássica). A <strong>mão direita</strong> (D) é responsável pela pulsação e ritmo. A <strong>mão esquerda</strong> (E) pressiona as cordas nos trastes para formar notas e acordes.</div>
            </div>

            {/* Block 5: Section Title */}
            <div className={`canvas-block ${selectedBlock === 5 ? 'selected' : ''}`} onClick={() => selectBlock(5)} ref={el => { canvasRefs.current[5] = el }}>
              <div contentEditable className="font-serif" style={{fontSize:'20px', color:'var(--grow)', borderLeft:'3px solid var(--grow)', paddingLeft:'12px'}}>🎯 Técnica</div>
            </div>

            {/* Block 6: Chord Diagram */}
            <div className={`canvas-block ${selectedBlock === 6 ? 'selected' : ''}`} onClick={() => selectBlock(6)} ref={el => { canvasRefs.current[6] = el }}>
              <div style={{fontSize:'14px', fontWeight:600, color:'var(--text)', marginBottom:'12px'}} contentEditable>Acorde G — Sol Maior</div>
              <div style={{display:'flex', gap:'24px', alignItems:'flex-start'}}>
                <div style={{width:'120px', height:'150px', border:'1px solid var(--border)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexShrink:0, cursor:'pointer'}} onClick={() => openModal('modal-trocar-acorde')}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'9px', color:'var(--text3)'}}>SVGuitar</div>
                    <div style={{fontSize:'24px', margin:'4px 0'}}>G</div>
                    <div style={{fontSize:'9px', color:'var(--text3)'}}>Clique para trocar</div>
                  </div>
                </div>
                <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8}}>O acorde de Sol Maior (G) utiliza os dedos 1, 2 e 3. Posicione o <strong>dedo 2</strong> na 3ª casa da 6ª corda, o <strong>dedo 1</strong> na 2ª casa da 5ª corda, e o <strong>dedo 3</strong> na 3ª casa da 1ª corda. Toque todas as 6 cordas.</div>
              </div>
            </div>

            {/* Block 7: Chord Diagram */}
            <div className={`canvas-block ${selectedBlock === 7 ? 'selected' : ''}`} onClick={() => selectBlock(7)} ref={el => { canvasRefs.current[7] = el }}>
              <div style={{fontSize:'14px', fontWeight:600, color:'var(--text)', marginBottom:'12px'}} contentEditable>Acorde C — Dó Maior</div>
              <div style={{display:'flex', gap:'24px', alignItems:'flex-start'}}>
                <div style={{width:'120px', height:'150px', border:'1px solid var(--border)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexShrink:0}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'9px', color:'var(--text3)'}}>SVGuitar</div>
                    <div style={{fontSize:'24px', margin:'4px 0'}}>C</div>
                    <div style={{fontSize:'9px', color:'var(--text3)'}}>Clique para trocar</div>
                  </div>
                </div>
                <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8}}>O acorde de Dó Maior (C) utiliza 3 dedos. <strong>Dedo 1</strong> na 1ª casa da 2ª corda, <strong>dedo 2</strong> na 2ª casa da 4ª corda, <strong>dedo 3</strong> na 3ª casa da 5ª corda. Não toque a 6ª corda.</div>
              </div>
            </div>

            {/* Block 8: Exercise */}
            <div className={`canvas-block ${selectedBlock === 8 ? 'selected' : ''}`} onClick={() => selectBlock(8)} ref={el => { canvasRefs.current[8] = el }}>
              <div style={{background:'var(--advance-soft)', borderRadius:'var(--radius-sm)', padding:'16px', borderLeft:'3px solid var(--advance)'}}>
                <div style={{fontSize:'14px', fontWeight:600, color:'var(--advance)', marginBottom:'8px'}} contentEditable>Exercício: Psicomotor 1234</div>
                <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8}}>Posicione os dedos 1, 2, 3 e 4 nas casas 1, 2, 3 e 4 respectivamente, na 1ª corda. Toque cada nota individualmente, mantendo os dedos anteriores pressionados. Repita em todas as cordas, de cima para baixo. Faça com metrônomo a 60 BPM.</div>
                <div style={{marginTop:'10px', padding:'10px', background:'var(--bg)', borderRadius:'6px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text2)'}}>1ª corda: 1-2-3-4 | 2ª corda: 1-2-3-4 | 3ª corda: 1-2-3-4 ...</div>
              </div>
            </div>

            {/* Block 9: Section Title */}
            <div className={`canvas-block ${selectedBlock === 9 ? 'selected' : ''}`} onClick={() => selectBlock(9)} ref={el => { canvasRefs.current[9] = el }}>
              <div contentEditable className="font-serif" style={{fontSize:'20px', color:'var(--advance)', borderLeft:'3px solid var(--advance)', paddingLeft:'12px'}}>🥁 Ritmo</div>
            </div>

            {/* Block 10: Notation */}
            <div className={`canvas-block ${selectedBlock === 10 ? 'selected' : ''}`} onClick={() => selectBlock(10)} ref={el => { canvasRefs.current[10] = el }}>
              <div style={{fontSize:'14px', fontWeight:600, color:'var(--text)', marginBottom:'12px'}} contentEditable>Figuras Rítmicas Básicas</div>
              <div style={{height:'80px', border:'1px solid var(--border)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', cursor:'pointer'}}>
                <div style={{textAlign:'center', fontSize:'11px', color:'var(--text3)'}}>
                  <MusicNotesSimple size={24} className="mx-auto mb-1" />
                  VexFlow — Semibreve, Mínima, Semínima, Colcheia<br/>
                  <span style={{fontSize:'9px'}}>Clique para editar notação</span>
                </div>
              </div>
              <div contentEditable style={{fontSize:'13px', color:'var(--text2)', lineHeight:1.8, marginTop:'10px'}}>A <strong>semibreve</strong> dura 4 tempos, a <strong>mínima</strong> dura 2, a <strong>semínima</strong> dura 1 e a <strong>colcheia</strong> dura ½ tempo. Pratique batendo o pulso com o pé enquanto conta os tempos em voz alta.</div>
            </div>

            {/* Block 11: Section Title */}
            <div className={`canvas-block ${selectedBlock === 11 ? 'selected' : ''}`} onClick={() => selectBlock(11)} ref={el => { canvasRefs.current[11] = el }}>
              <div contentEditable className="font-serif" style={{fontSize:'20px', color:'var(--master)', borderLeft:'3px solid var(--master)', paddingLeft:'12px'}}>🎵 Repertório</div>
            </div>

            {/* Block 12: Repertoire Sheet */}
            <div className={`canvas-block ${selectedBlock === 12 ? 'selected' : ''}`} onClick={() => selectBlock(12)} ref={el => { canvasRefs.current[12] = el }}>
              <div style={{border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'16px', background:'var(--bg)'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px'}}>
                  <div style={{fontSize:'16px', fontWeight:600, color:'var(--text)'}} contentEditable>Love Me Do — Beatles</div>
                  <span className="badge badge-dourado">Nível 1</span>
                </div>
                <div style={{fontSize:'12px', color:'var(--text3)', marginBottom:'10px'}}>Tom: G · Gênero: Rock · Acordes: G, C, D</div>
                <div style={{display:'flex', gap:'12px', marginBottom:'12px'}}>
                  <div style={{width:'60px', height:'75px', border:'1px solid var(--border)', borderRadius:'6px', textAlign:'center', paddingTop:'8px', background:'var(--card)', fontSize:'9px', color:'var(--text3)'}}>SVGuitar<div style={{fontSize:'16px', fontWeight:700, marginTop:'2px'}}>G</div></div>
                  <div style={{width:'60px', height:'75px', border:'1px solid var(--border)', borderRadius:'6px', textAlign:'center', paddingTop:'8px', background:'var(--card)', fontSize:'9px', color:'var(--text3)'}}>SVGuitar<div style={{fontSize:'16px', fontWeight:700, marginTop:'2px'}}>C</div></div>
                  <div style={{width:'60px', height:'75px', border:'1px solid var(--border)', borderRadius:'6px', textAlign:'center', paddingTop:'8px', background:'var(--card)', fontSize:'9px', color:'var(--text3)'}}>SVGuitar<div style={{fontSize:'16px', fontWeight:700, marginTop:'2px'}}>D</div></div>
                </div>
                <div contentEditable style={{fontSize:'12px', color:'var(--text2)', fontFamily:'var(--font-mono)', lineHeight:2}}>Intro: G — C | G — C<br/>Verso: G — C | G — C | G — C | D<br/>Refrão: D — C | G</div>
              </div>
            </div>

            {/* Block 13: Achievement */}
            <div className={`canvas-block ${selectedBlock === 13 ? 'selected' : ''}`} onClick={() => selectBlock(13)} ref={el => { canvasRefs.current[13] = el }}>
              <div style={{textAlign:'center', padding:'16px', background:'linear-gradient(135deg,var(--verde-soft),var(--dourado-soft))', borderRadius:'var(--radius)', border:'1px dashed var(--dourado)'}}>
                <div style={{fontSize:'36px', marginBottom:'6px'}}>🎸</div>
                <div style={{fontSize:'16px', fontWeight:700, color:'var(--text)'}} contentEditable>Primeiro Acorde!</div>
                <div style={{fontSize:'12px', color:'var(--text2)', marginTop:'4px'}} contentEditable>Parabéns! Você tocou seu primeiro acorde. Continue praticando!</div>
                <span className="badge badge-dourado" style={{marginTop:'8px', display:'inline-flex'}}>+100 pontos</span>
              </div>
            </div>

            {/* Block 14: QR Code */}
            <div className={`canvas-block ${selectedBlock === 14 ? 'selected' : ''}`} onClick={() => selectBlock(14)} ref={el => { canvasRefs.current[14] = el }}>
              <div style={{display:'flex', alignItems:'center', gap:'16px', padding:'14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)'}}>
                <div style={{width:'72px', height:'72px', border:'1px solid var(--border)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexShrink:0}}>
                  <QrCode size={32} style={{color:'var(--text3)'}} />
                </div>
                <div>
                  <div style={{fontSize:'13px', fontWeight:600, color:'var(--text)'}} contentEditable>Backing Track — Love Me Do</div>
                  <div style={{fontSize:'11px', color:'var(--text3)', marginTop:'4px'}} contentEditable>Escaneie o QR code para acessar o backing track no YouTube e praticar junto!</div>
                  <div style={{fontSize:'10px', color:'var(--azul-claro)', marginTop:'4px'}}>youtube.com/watch?v=...</div>
                </div>
              </div>
            </div>

            <div className="add-block-btn" onClick={() => openModal('modal-add-block')}>
              <PlusCircle size={18} className="mx-auto mb-1" /><br/>
              Adicionar novo bloco aqui
            </div>
          </div>
        </div>

        {/* RIGHT: Properties */}
        <div className="editor-properties">
          <div className="form-label mb-3" style={{color:'var(--accent)'}}>Propriedades do Bloco</div>
          <div className="prop-section">
            <div className="prop-label">Tipo</div>
            <div style={{padding:'8px 12px', background:'var(--azul-soft)', borderRadius:'6px', fontSize:'12px', color:'var(--azul-claro)', fontWeight:600}}>
              <ImageIcon size={16} className="inline-block mr-1 mb-0.5" /> Capa do Material
            </div>
          </div>
          <div className="prop-section">
            <div className="prop-label">Logo da escola</div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{width:'40px', height:'40px', borderRadius:'8px', background:'linear-gradient(135deg,var(--azul-escuro),var(--azul))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'12px', fontWeight:800}}>LA</div>
              <button className="btn btn-ghost btn-sm">Trocar</button>
            </div>
          </div>
          <div className="prop-section">
            <div className="prop-label">Título</div>
            <input className="form-input" defaultValue="Fundamentos 1" style={{fontSize:'12px', padding:'8px 12px'}} />
          </div>
          <div className="prop-section">
            <div className="prop-label">Subtítulo</div>
            <input className="form-input" defaultValue="Violão · Foundation · 10 Aulas" style={{fontSize:'12px', padding:'8px 12px'}} />
          </div>
          <div className="prop-section">
            <div className="prop-label">Cores da capa</div>
            <div style={{display:'flex', gap:'6px', marginTop:'4px'}}>
              <div style={{width:'28px', height:'28px', borderRadius:'6px', background:'#1E3A5F', cursor:'pointer', border:'2px solid var(--accent)'}}></div>
              <div style={{width:'28px', height:'28px', borderRadius:'6px', background:'#FF2D78', cursor:'pointer', border:'1px solid var(--border)'}}></div>
              <div style={{width:'28px', height:'28px', borderRadius:'6px', background:'#6366F1', cursor:'pointer', border:'1px solid var(--border)'}}></div>
              <div style={{width:'28px', height:'28px', borderRadius:'6px', background:'#F1F5F9', cursor:'pointer', border:'1px solid var(--border)'}}></div>
            </div>
          </div>
          <hr className="divider" />
          <div className="prop-section">
            <div className="prop-label">Status</div>
            <div style={{display:'flex', gap:'4px'}}>
              <span className="badge badge-dourado">Rascunho</span>
              <span className="badge badge-azul">v2</span>
            </div>
          </div>
          <div className="prop-section">
            <div className="prop-label">Ações do bloco</div>
            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'flex-start'}}><ArrowUp size={16} /> Mover para cima</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'flex-start'}}><ArrowDown size={16} /> Mover para baixo</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'flex-start'}}><Copy size={16} /> Duplicar bloco</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'flex-start'}}><ArrowCounterClockwise size={16} /> Reverter original</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'flex-start', color:'var(--vermelho)'}}><Trash size={16} /> Remover bloco</button>
            </div>
          </div>
          <hr className="divider" />
          <div className="prop-section">
            <div className="prop-label">Exportar material</div>
            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
              <button className="btn btn-primary btn-sm w-full" style={{justifyContent:'center'}} onClick={() => showToast('📄 PDF gerado com sucesso!')}><FilePdf size={16} /> Exportar PDF</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'center'}}><Code size={16} /> Ver HTML</button>
              <button className="btn btn-ghost btn-sm w-full" style={{justifyContent:'center'}} onClick={() => showToast('📱 Enviado via WhatsApp!')}><WhatsappLogo size={16} /> Enviar WhatsApp</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
