window.BOS_MODULE_CONFIG={module:'dof',mode:'standalone',root:'./',bosBuild:79};

// Le bouton d'installation appartient au shell standalone et reste absent du module intégré.
(function(){
  const app=document.getElementById('mainApp');
  const header=app?.querySelector?.('.topbar');
  if(app&&header&&!document.getElementById('installAppRow')){
    const row=document.createElement('section');
    row.className='install-app-row';
    row.id='installAppRow';
    row.hidden=true;
    row.setAttribute('aria-label','Installer Bruno OnSet');
    row.innerHTML='<button class="install-app-btn" id="installAppBtn" type="button">INSTALLER L’APPLICATION <span aria-hidden="true">→</span></button>';
    app.insertBefore(row,header);
  }

  if(!document.getElementById('installDialog')){
    const dialog=document.createElement('dialog');
    dialog.id='installDialog';
    dialog.className='sheet install-sheet';
    dialog.innerHTML='<form method="dialog" class="sheet-inner install-sheet-inner"><div class="sheet-head"><div><strong>Installer Bruno OnSet</strong><small id="installHelpText">Ajoutez l’application à votre écran d’accueil.</small></div><button value="close" class="iconbtn" aria-label="Fermer">×</button></div><div class="install-help" id="installHelpBody"></div><div class="sheet-actions"><button value="close" class="primary">Compris</button></div></form>';
    document.body.appendChild(dialog);
  }
})();

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
