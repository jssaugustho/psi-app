'use client';

import React from 'react';
import { AtomicComponent, ComponentStyle } from '../types';
import { Input, Select } from '@psi/ui';
import { IconPicker } from './components/IconPicker';
import { GlobalColorPicker } from './components/GlobalColorPicker';
import { InlineTypographyControl } from './components/InlineTypographyControl';
import { ListItemsEditor, ListItem } from './components/ListItemsEditor';

interface ContentPropsPanelProps {
  component: AtomicComponent;
  isMobile: boolean;
  effectiveProps: Record<string, any>;
  page?: any;
  onPropChange: (key: string, value: any) => void;
}

/** Retorna true para tipos que possuem props internas editaveis */
export function hasContentProps(type: string): boolean {
  return ['heading', 'paragraph', 'label', 'badge', 'button', 'card', 'faq_item', 'list', 'stat_counter', 'image', 'testimonial'].includes(type);
}

export function ContentPropsPanel({
  component,
  isMobile,
  effectiveProps,
  page,
  onPropChange,
}: ContentPropsPanelProps) {
  const type = component.type;

  // -------------------------------------------------------------------------
  // HEADING
  // -------------------------------------------------------------------------
  if (type === 'heading') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Texto do Titulo</label>
          <Input
            type="text"
            value={effectiveProps.text || ''}
            onChange={(e) => onPropChange('text', e.target.value)}
            className="text-xs font-bold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nivel (H1 a H4)</label>
          <Select
            value={String(effectiveProps.level || 2)}
            onChange={(e) => onPropChange('level', parseInt(e.target.value))}
            options={[
              { value: '1', label: 'H1 — Principal' },
              { value: '2', label: 'H2 — Secao' },
              { value: '3', label: 'H3 — Subsecao' },
              { value: '4', label: 'H4' },
            ]}
            variant="glass"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PARAGRAPH
  // -------------------------------------------------------------------------
  if (type === 'paragraph') {
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">Conteudo do Paragrafo</label>
        <textarea
          rows={5}
          value={effectiveProps.html || ''}
          onChange={(e) => onPropChange('html', e.target.value)}
          className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-y font-mono"
          placeholder="<p>Escreva seu texto aqui...</p>"
        />
        <p className="text-[9px] text-slate-400">Suporta HTML basico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // LABEL
  // -------------------------------------------------------------------------
  if (type === 'label') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Texto</label>
          <Input
            type="text"
            value={effectiveProps.text || ''}
            onChange={(e) => onPropChange('text', e.target.value)}
            className="text-xs uppercase font-bold tracking-wide"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Tag HTML</label>
          <Select
            value={effectiveProps.htmlTag || 'span'}
            onChange={(e) => onPropChange('htmlTag', e.target.value)}
            options={[
              { value: 'span', label: 'span (inline)' },
              { value: 'p', label: 'p (paragrafo)' },
              { value: 'small', label: 'small' },
              { value: 'strong', label: 'strong' },
            ]}
            variant="glass"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // BADGE
  // -------------------------------------------------------------------------
  if (type === 'badge') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Texto</label>
          <Input
            type="text"
            value={effectiveProps.text || ''}
            onChange={(e) => onPropChange('text', e.target.value)}
            className="text-xs uppercase font-bold tracking-wide"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Icone</label>
          <IconPicker
            selectedName={effectiveProps.iconLeft || 'Sparkles'}
            onSelectIcon={(name) => onPropChange('iconLeft', name)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Formato</label>
          <div className="grid grid-cols-2 gap-1">
            {[
              { value: true, label: 'Pill (arredondado)' },
              { value: false, label: 'Quadrado' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onPropChange('rounded', opt.value)}
                className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveProps.rounded !== false) === opt.value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-[var(--surface-border)] text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Variante</label>
          <Select
            value={effectiveProps.variant || 'brand'}
            onChange={(e) => onPropChange('variant', e.target.value)}
            options={[
              { value: 'brand', label: 'Marca' },
              { value: 'success', label: 'Sucesso (verde)' },
              { value: 'warning', label: 'Aviso (amarelo)' },
              { value: 'info', label: 'Info (azul)' },
              { value: 'neutral', label: 'Neutro' },
            ]}
            variant="glass"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // BUTTON
  // -------------------------------------------------------------------------
  if (type === 'button') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Rotulo do Botao</label>
          <Input
            type="text"
            value={effectiveProps.label || ''}
            onChange={(e) => onPropChange('label', e.target.value)}
            className="text-xs font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Acao do Clique</label>
          <Select
            value={effectiveProps.action || 'cta_primary'}
            onChange={(e) => onPropChange('action', e.target.value)}
            options={[
              { value: 'cta_primary', label: 'Destino Principal (Triagem/WhatsApp)' },
              { value: 'scroll_to', label: 'Rolar para Secao' },
              { value: 'external_url', label: 'Link Externo' },
              { value: 'whatsapp', label: 'WhatsApp direto' },
            ]}
            variant="glass"
          />
        </div>

        {effectiveProps.action === 'scroll_to' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">ID da Secao Destino</label>
            <Input
              type="text"
              value={effectiveProps.scrollTargetId || ''}
              onChange={(e) => onPropChange('scrollTargetId', e.target.value)}
              placeholder="ex: sec-about"
              className="text-xs font-mono"
            />
          </div>
        )}

        {effectiveProps.action === 'external_url' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">URL Externa</label>
            <Input
              type="text"
              value={effectiveProps.externalUrl || ''}
              onChange={(e) => onPropChange('externalUrl', e.target.value)}
              placeholder="https://..."
              className="text-xs"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Tamanho</label>
          <div className="grid grid-cols-4 gap-1">
            {['sm', 'md', 'lg', 'xl'].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onPropChange('size', sz)}
                className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                  (effectiveProps.size || 'md') === sz
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-[var(--surface-border)] text-slate-500'
                }`}
              >
                {sz.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Icone Esquerdo</label>
          <IconPicker
            selectedName={effectiveProps.iconLeft || ''}
            onSelectIcon={(name) => onPropChange('iconLeft', name)}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CARD
  // -------------------------------------------------------------------------
  if (type === 'card') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Titulo do Card</label>
          <Input
            type="text"
            value={effectiveProps.title || ''}
            onChange={(e) => onPropChange('title', e.target.value)}
            className="text-xs font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Descricao</label>
          <textarea
            rows={3}
            value={effectiveProps.body || ''}
            onChange={(e) => onPropChange('body', e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Icone</label>
          <IconPicker
            selectedName={effectiveProps.iconName || 'HeartHandshake'}
            onSelectIcon={(name) => onPropChange('iconName', name)}
          />
        </div>

        <GlobalColorPicker
          label="Cor do Icone"
          value={effectiveProps.iconColor || ''}
          onChange={(v) => onPropChange('iconColor', v)}
          page={page}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Variante Visual</label>
          <Select
            value={effectiveProps.variant || 'glass'}
            onChange={(e) => onPropChange('variant', e.target.value)}
            options={[
              { value: 'glass', label: 'Glass (translucido)' },
              { value: 'flat', label: 'Flat (simples)' },
              { value: 'outlined', label: 'Outlined (borda)' },
              { value: 'elevated', label: 'Elevated (sombra)' },
            ]}
            variant="glass"
          />
        </div>

        <InlineTypographyControl
          label="Fonte do Titulo"
          sizeValue={effectiveProps.titleFontSize}
          weightValue={effectiveProps.titleFontWeight}
          colorValue={effectiveProps.titleColor}
          page={page}
          onChangeSize={(v) => onPropChange('titleFontSize', v)}
          onChangeWeight={(v) => onPropChange('titleFontWeight', v)}
          onChangeColor={(v) => onPropChange('titleColor', v)}
        />

        <InlineTypographyControl
          label="Fonte da Descricao"
          sizeValue={effectiveProps.bodyFontSize}
          weightValue={effectiveProps.bodyFontWeight}
          colorValue={effectiveProps.bodyColor}
          page={page}
          onChangeSize={(v) => onPropChange('bodyFontSize', v)}
          onChangeWeight={(v) => onPropChange('bodyFontWeight', v)}
          onChangeColor={(v) => onPropChange('bodyColor', v)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FAQ ITEM
  // -------------------------------------------------------------------------
  if (type === 'faq_item') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Pergunta</label>
          <Input
            type="text"
            value={effectiveProps.question || ''}
            onChange={(e) => onPropChange('question', e.target.value)}
            className="text-xs font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Resposta</label>
          <textarea
            rows={4}
            value={effectiveProps.answer || ''}
            onChange={(e) => onPropChange('answer', e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surface-border)] glass-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Aberto por padrao</span>
          <button
            type="button"
            onClick={() => onPropChange('defaultOpen', !effectiveProps.defaultOpen)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
              effectiveProps.defaultOpen
                ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                : 'border-[var(--surface-border)] text-slate-500'
            }`}
          >
            {effectiveProps.defaultOpen ? 'Sim' : 'Nao'}
          </button>
        </div>

        <InlineTypographyControl
          label="Fonte da Pergunta"
          sizeValue={effectiveProps.questionFontSize}
          weightValue={effectiveProps.questionFontWeight}
          colorValue={effectiveProps.questionColor}
          page={page}
          onChangeSize={(v) => onPropChange('questionFontSize', v)}
          onChangeWeight={(v) => onPropChange('questionFontWeight', v)}
          onChangeColor={(v) => onPropChange('questionColor', v)}
        />

        <InlineTypographyControl
          label="Fonte da Resposta"
          sizeValue={effectiveProps.answerFontSize}
          weightValue={effectiveProps.answerFontWeight}
          colorValue={effectiveProps.answerColor}
          page={page}
          onChangeSize={(v) => onPropChange('answerFontSize', v)}
          onChangeWeight={(v) => onPropChange('answerFontWeight', v)}
          onChangeColor={(v) => onPropChange('answerColor', v)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // STAT COUNTER (Timeline)
  // -------------------------------------------------------------------------
  if (type === 'stat_counter') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Principal</label>
          <Input
            type="text"
            value={effectiveProps.value || ''}
            onChange={(e) => onPropChange('value', e.target.value)}
            className="text-xs font-mono font-bold"
            placeholder="ex: 01, +500, 10k"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Rotulo / Label</label>
          <Input
            type="text"
            value={effectiveProps.label || ''}
            onChange={(e) => onPropChange('label', e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Icone Decorativo</label>
          <IconPicker
            selectedName={effectiveProps.iconName || ''}
            onSelectIcon={(name) => onPropChange('iconName', name)}
          />
          {effectiveProps.iconName && (
            <button
              type="button"
              onClick={() => onPropChange('iconName', '')}
              className="text-[9px] text-red-400 hover:text-red-600 cursor-pointer"
            >
              Remover icone
            </button>
          )}
        </div>

        {effectiveProps.iconName && (
          <GlobalColorPicker
            label="Cor do Icone"
            value={effectiveProps.iconColor || ''}
            onChange={(v) => onPropChange('iconColor', v)}
            page={page}
          />
        )}

        <InlineTypographyControl
          label="Fonte do Valor"
          sizeValue={effectiveProps.valueFontSize}
          weightValue={effectiveProps.valueFontWeight}
          colorValue={effectiveProps.valueColor}
          page={page}
          onChangeSize={(v) => onPropChange('valueFontSize', v)}
          onChangeWeight={(v) => onPropChange('valueFontWeight', v)}
          onChangeColor={(v) => onPropChange('valueColor', v)}
        />

        <InlineTypographyControl
          label="Fonte do Rotulo"
          sizeValue={effectiveProps.labelFontSize}
          weightValue={effectiveProps.labelFontWeight}
          colorValue={effectiveProps.labelColor}
          page={page}
          onChangeSize={(v) => onPropChange('labelFontSize', v)}
          onChangeWeight={(v) => onPropChange('labelFontWeight', v)}
          onChangeColor={(v) => onPropChange('labelColor', v)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // LIST
  // -------------------------------------------------------------------------
  if (type === 'list') {
    const items: ListItem[] = (effectiveProps.items || []).map((it: any) =>
      typeof it === 'string' ? { text: it } : it
    );

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Lista</label>
          <Select
            value={effectiveProps.listType || 'check'}
            onChange={(e) => onPropChange('listType', e.target.value)}
            options={[
              { value: 'check', label: 'Check (marcador de verificacao)' },
              { value: 'bullet', label: 'Bullet (ponto)' },
              { value: 'number', label: 'Numerado' },
              { value: 'icon', label: 'Icone por item' },
            ]}
            variant="glass"
          />
        </div>

        <GlobalColorPicker
          label="Cor dos Icones / Marcadores"
          value={effectiveProps.iconColor || ''}
          onChange={(v) => onPropChange('iconColor', v)}
          page={page}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Itens</label>
          <ListItemsEditor
            items={items}
            showIconPicker={effectiveProps.listType === 'icon'}
            onChange={(newItems) => onPropChange('items', newItems)}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // IMAGE
  // -------------------------------------------------------------------------
  if (type === 'image') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">URL da Imagem</label>
          <Input
            type="text"
            value={effectiveProps.src || ''}
            onChange={(e) => onPropChange('src', e.target.value)}
            placeholder="https://..."
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Texto Alternativo (ALT)</label>
          <Input
            type="text"
            value={effectiveProps.alt || ''}
            onChange={(e) => onPropChange('alt', e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Proporção (Aspect Ratio)</label>
          <div className="grid grid-cols-4 gap-1">
            {['16/9', '4/3', '1/1', '3/4'].map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => onPropChange('aspectRatio', ar)}
                className={`py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                  (effectiveProps.aspectRatio || '16/9') === ar
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-[var(--surface-border)] text-slate-500'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Ajuste da Imagem</label>
          <Select
            value={effectiveProps.objectFit || 'cover'}
            onChange={(e) => onPropChange('objectFit', e.target.value)}
            options={[
              { value: 'cover', label: 'Cover (preenche)' },
              { value: 'contain', label: 'Contain (cabe tudo)' },
              { value: 'fill', label: 'Fill (estica)' },
            ]}
            variant="glass"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // TESTIMONIAL
  // -------------------------------------------------------------------------
  if (type === 'testimonial') {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Depoimento</label>
          <textarea
            rows={3}
            value={effectiveProps.quote || ''}
            onChange={(e) => onPropChange('quote', e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-[var(--surface-border)] bg-transparent text-slate-900 dark:text-white outline-none resize-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Autor</label>
          <Input
            type="text"
            value={effectiveProps.authorName || ''}
            onChange={(e) => onPropChange('authorName', e.target.value)}
            className="text-xs font-bold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Titulo / Cargo</label>
          <Input
            type="text"
            value={effectiveProps.authorTitle || ''}
            onChange={(e) => onPropChange('authorTitle', e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Avaliacao (Estrelas)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onPropChange('rating', star)}
                className={`text-lg cursor-pointer transition-transform hover:scale-110 ${
                  (effectiveProps.rating || 5) >= star ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}