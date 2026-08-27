/**
 * Declarative interactive prompts for the WhatsApp flow.
 *
 * WhatsApp gives you two native fixed-choice components: Quick Reply buttons,
 * capped at three, and List Messages, capped at ten rows. Phase 7's input rules
 * are written against those caps — buttons for season and peek type, a list for
 * Gat selection, free text for crop name.
 *
 * The caps are enforced here as invariants. Building a prompt with four buttons
 * throws, so a fourth option added later fails a test rather than producing a
 * message WhatsApp silently truncates. That is what the WATER_SOURCES "other"
 * branch exists to work around: four water sources, three button slots.
 *
 * ---------------------------------------------------------------------------
 * Rendering: numbered text, not native components. This is a real limitation.
 *
 * This bot replies over TwiML webhook responses, and a TwiML <Message> cannot
 * carry buttons or list rows — those need a pre-approved WhatsApp Content
 * Template sent through the REST API, and template approval is an external review
 * process outside this build's timeline. So every prompt below renders to a
 * numbered text menu, and the matcher accepts both the number and the option's own
 * words.
 *
 * The structure is kept anyway rather than writing menus by hand: the caps hold,
 * each option keeps its key and its keywords, and a template-backed sender can be
 * added as a second renderer without the flow changing. Nothing in the state
 * machine knows how a prompt reaches the farmer.
 */

const PROMPT_KINDS = {
  BUTTONS: 'BUTTONS',
  LIST: 'LIST',
  TEXT: 'TEXT',
};

// WhatsApp platform caps. Not tuning knobs.
const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toAsciiDigits(text) {
  return String(text).replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
}

function assertShape(options, label) {
  options.forEach((option) => {
    if (!option || !option.key || !option.label) {
      throw new Error(`Every ${label} needs a key and a label`);
    }
  });
}

function assertOptions(options, kind, max) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error(`A ${kind} prompt needs at least one option`);
  }
  if (options.length > max) {
    throw new Error(
      `A ${kind} prompt allows at most ${max} options; got ${options.length}. `
      + 'WhatsApp will not render more, so split the step instead of overfilling it.',
    );
  }
  assertShape(options, 'prompt option');
}

/**
 * Options accepted but never shown as a numbered row.
 *
 * This is what the water-source step needs: four real answers, three button
 * slots. The fourth is mentioned in the prompt body as a word to type and lives
 * here, so it is still a first-class option the matcher recognises — rather than
 * a string comparison hidden in the state machine — without inflating the row
 * count or shifting the numbering of the options that are shown.
 */
function withExtras(prompt, extraOptions) {
  if (!extraOptions || !extraOptions.length) return prompt;
  assertShape(extraOptions, 'extra prompt option');
  return { ...prompt, extraOptions };
}

/**
 * Quick Reply buttons — up to three mutually exclusive choices.
 * @param {string} body
 * @param {Array<{key: string, label: string, keywords?: string[]}>} options
 * @param {Array<{key: string, label: string, keywords?: string[]}>} [extraOptions]
 *   keyword-only answers, not rendered as rows. See withExtras.
 */
function buttonPrompt(body, options, extraOptions) {
  assertOptions(options, PROMPT_KINDS.BUTTONS, MAX_BUTTONS);
  return withExtras({ kind: PROMPT_KINDS.BUTTONS, body, options }, extraOptions);
}

/**
 * List Message — up to ten rows, for a set too big for buttons but still fixed.
 * @param {string} body
 * @param {Array<{key: string, label: string, description?: string, keywords?: string[]}>} options
 * @param {Array<{key: string, label: string, keywords?: string[]}>} [extraOptions]
 */
function listPrompt(body, options, extraOptions) {
  assertOptions(options, PROMPT_KINDS.LIST, MAX_LIST_ROWS);
  return withExtras({ kind: PROMPT_KINDS.LIST, body, options }, extraOptions);
}

/** Free text or a voice note. Used where a fixed list would be dishonest — crop name. */
function textPrompt(body) {
  return { kind: PROMPT_KINDS.TEXT, body, options: [] };
}

/**
 * Render a prompt to the text WhatsApp will actually receive.
 * Options are numbered from 1 because a farmer replying "0" means nothing.
 */
function renderPrompt(prompt) {
  if (!prompt) return '';
  if (prompt.kind === PROMPT_KINDS.TEXT || !prompt.options.length) return prompt.body;

  const lines = prompt.options.map((option, index) => {
    const suffix = option.description ? ` — ${option.description}` : '';
    return `${index + 1}. ${option.label}${suffix}`;
  });

  return `${prompt.body}\n\n${lines.join('\n')}`;
}

/**
 * Which option a reply selected, or null if none did.
 *
 * Accepts the row number in either digit script, the option's label, or any of
 * its keywords. Matching is loose on purpose: a farmer who reads "1. खरीप" and
 * types "खरीप" has answered the question, and re-asking because they did not send
 * a bare digit would be the bot's failure, not theirs.
 */
function matchOption(prompt, replyText) {
  if (!prompt) return null;
  const searchable = [...(prompt.options || []), ...(prompt.extraOptions || [])];
  if (!searchable.length) return null;
  if (typeof replyText !== 'string' || !replyText.trim()) return null;

  const text = toAsciiDigits(replyText.trim().toLowerCase());

  // Numbering covers the rendered rows only. An extra option has no row number,
  // so a farmer cannot select it by a number that was never printed.
  const asNumber = text.match(/^(\d{1,2})[.)]?$/);
  if (asNumber) {
    const index = Number.parseInt(asNumber[1], 10) - 1;
    return prompt.options[index] || null;
  }

  return searchable.find((option) => {
    const candidates = [option.label, option.key, ...(option.keywords || [])];
    return candidates.some((candidate) => typeof candidate === 'string'
      && candidate.trim().toLowerCase() === text);
  }) || null;
}

module.exports = {
  PROMPT_KINDS,
  MAX_BUTTONS,
  MAX_LIST_ROWS,
  buttonPrompt,
  listPrompt,
  textPrompt,
  renderPrompt,
  matchOption,
};
