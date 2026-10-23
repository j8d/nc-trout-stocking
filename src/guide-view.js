import { citationParts } from './guide-model.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function sourceLink(source, water, inline = false) {
  const anchor = node('a', inline ? 'citation' : '', inline ? `[${source.id}]` : `[${source.id}] ${source.title} ↗`);
  anchor.href = source.url;
  anchor.dataset.sourceId = source.id;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.setAttribute('aria-label', `Source ${source.id}: ${source.title} — ${water.name}, ${water.county} County (opens in new tab)`);
  return anchor;
}

function citedText(element, text, sources, water) {
  for (const part of citationParts(text)) {
    if (part.text !== undefined) element.append(document.createTextNode(part.text));
    else {
      const sup = node('sup');
      sup.append(sourceLink(sources.get(part.sourceId), water, true));
      element.append(sup);
    }
  }
}

export function renderGuide(entry, sources, water, researched) {
  const guide = node('div', 'angler-guide');
  const summary = node('p', 'angler-summary');
  citedText(summary, entry.summary, sources, water);
  const planning = node('p', 'planning-note');
  planning.append(node('strong', '', 'Trip-planning note: '));
  citedText(planning, entry.planningNote, sources, water);
  const research = node('p', 'guide-researched', 'Researched ');
  const time = node('time', '', 'October 23, 2026');
  time.dateTime = researched;
  research.append(time, '. Check current conditions before traveling.');
  const sourceList = node('ul', 'source-list');
  sourceList.setAttribute('aria-label', `Sources for ${water.name}, ${water.county} County`);
  for (const id of entry.sourceIds) {
    const li = node('li');
    li.append(sourceLink(sources.get(id), water));
    sourceList.append(li);
  }
  guide.append(summary, planning, research, sourceList);
  return guide;
}

export function renderGuideDisclosure(entry, sources, water, researched, date) {
  const disclosure = node('details', 'guide-disclosure');
  const trigger = node('summary', '', 'Angler guide');
  trigger.setAttribute('aria-label', `Angler guide — ${water.name}, ${water.county} County`);
  const body = node('div', 'guide-body');
  const scheduled = node('p', 'guide-date', 'Delayed harvest · Scheduled: ');
  const time = node('time', '', date);
  time.dateTime = water.date;
  scheduled.append(time);
  body.append(scheduled, node('p', 'section-description', water.section), renderGuide(entry, sources, water, researched));
  disclosure.append(trigger, body);
  return disclosure;
}
