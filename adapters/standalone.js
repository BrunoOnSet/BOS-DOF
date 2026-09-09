window.BOS_MODULE_CONFIG={module:'dof',mode:'standalone',root:'./',bosBuild:79};

// En standalone, l'emplacement du retour au cockpit devient le CTA professionnel.
// Le module intégré conserve son bouton de retour via adapters/integrated.js.
(function(){
  const back=document.getElementById('bosBackBtn');
  const row=back?.closest?.('[data-bos-return]')||back?.parentElement;
  if(!back||!row)return;

  const contact=document.createElement('button');
  contact.type='button';
  contact.id='projectContactBtn';
  contact.className=back.className;
  contact.textContent='Parler de votre tournage →';

  row.removeAttribute('data-bos-return');
  row.setAttribute('aria-label','Parler de votre tournage');
  back.replaceWith(contact);
})();
