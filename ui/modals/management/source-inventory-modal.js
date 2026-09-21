import { Popup, POPUP_TYPE } from '../../../../../../popup.js';
import { listTranscriptSources } from '../../../core/transcript/transcript-source-registration-transport.js';
import { renderSourceInventoryView } from '../../../core/transcript/source-inventory-view.js';

export const renderSourceInventoryModal = renderSourceInventoryView;

export async function openSourceInventoryModal() {
    const context = globalThis.SillyTavern?.getContext?.() || {};
    const character = Number.isInteger(Number(context.characterId)) ? context.characters?.[Number(context.characterId)] : null;
    const marker = character?.data?.extensions?.shardwright ?? character?.json_data?.extensions?.shardwright ?? character?.extensions?.shardwright;
    const result = marker?.characterInstanceId ? await listTranscriptSources() : { state: 'REFUSED', reason: 'CHARACTER_INSTANCE_UNAVAILABLE' };
    const popup = new Popup(renderSourceInventoryModal(result, marker?.characterInstanceId), POPUP_TYPE.TEXT, null, { title: 'Source inventory', okButton: 'Close', wide: true });
    return popup.show();
}
