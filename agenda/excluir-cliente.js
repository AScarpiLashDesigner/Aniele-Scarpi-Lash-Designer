/* Shared confirmation for the private client lists. */
window.AS_confirmDeleteClient = async function(clientId, rpc) {
  const preview = await rpc({p_client_id:clientId,p_confirm:false,p_expected_version:null});
  if (!preview || typeof preview.name !== 'string' || !Number.isInteger(preview.appointments)) throw Error('Não foi possível conferir a cliente. Atualize a página.');
  const details = preview.appointments > 0 ? '\n\nTambém serão removidos '+preview.appointments+' atendimento(s) desta cliente da agenda, incluindo o histórico e as manutenções.' : '\n\nEsta cliente não possui atendimentos na agenda.';
  if (!window.confirm('Excluir a cliente "'+preview.name+'"?'+details+'\n\nA ficha de anamnese e os links individuais também serão excluídos. Confirme somente se deseja apagar este cadastro.')) return false;
  const result = await rpc({p_client_id:clientId,p_confirm:true,p_expected_version:preview.version});
  if (!result?.deleted) throw Error('A exclusão não foi confirmada. Atualize a lista.');
  return true;
};
