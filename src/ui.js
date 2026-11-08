const weaponStatus = document.getElementById('weapon-status');
const ammoCount = document.getElementById('ammo-count');
const axeDurability = document.getElementById('axe-durability');
const equippedWeapon = document.getElementById('equipped-weapon');
const falseJumpscare = document.getElementById('false-jumpscare');
const ambientJumpscare = document.getElementById('ambient-jumpscare');
const deathOverlay = document.getElementById('jumpscare-overlay');
const respawnButton = document.getElementById('respawn-button');
const newGameButton = document.getElementById('new-game-button');
let scareTimer = 0;
let ambientScareTimer = 0;

export function updateWeaponStatus({ weapon, axeUses, shotgunLoaded, shotgunAmmo, axeOwned, shotgunOwned }) {
    ammoCount.textContent = `${shotgunOwned ? shotgunLoaded : 0} / ${shotgunOwned ? shotgunAmmo : 0}`;
    axeDurability.textContent = `${axeOwned ? axeUses : 0} / 7`;
    weaponStatus.dataset.equipped = weapon;
    equippedWeapon.textContent = weapon === 'axe'
        ? 'ASCIA · G: RIPONI'
        : weapon === 'shotgun'
            ? 'FUCILE · G: RIPONI'
            : 'TORCIA · G: IMPUGNA ARMA';
}

export function triggerFalseJumpscare(playScream, hasDoctorModel, shakeCamera) {
    if (falseJumpscare.classList.contains('active')) return;
    document.getElementById('false-jumpscare-face').style.display = hasDoctorModel ? 'none' : 'block';
    falseJumpscare.classList.add('active');
    falseJumpscare.setAttribute('aria-hidden', 'false');
    playScream();
    shakeCamera();
    window.clearTimeout(scareTimer);
    scareTimer = window.setTimeout(() => {
        falseJumpscare.classList.remove('active');
        falseJumpscare.setAttribute('aria-hidden', 'true');
    }, 400);
}

export function showAmbientJumpscare(imageUrl, duration, onComplete) {
    window.clearTimeout(ambientScareTimer);
    ambientJumpscare.style.backgroundImage =
        `linear-gradient(rgb(0 0 0 / 18%), rgb(0 0 0 / 30%)), url("${imageUrl}")`;
    ambientJumpscare.classList.add('active');
    ambientJumpscare.setAttribute('aria-hidden', 'false');
    ambientScareTimer = window.setTimeout(() => {
        ambientJumpscare.classList.remove('active');
        ambientJumpscare.setAttribute('aria-hidden', 'true');
        ambientJumpscare.style.backgroundImage = '';
        onComplete();
    }, duration);
}

export function hideAmbientJumpscare() {
    window.clearTimeout(ambientScareTimer);
    ambientJumpscare.classList.remove('active');
    ambientJumpscare.setAttribute('aria-hidden', 'true');
    ambientJumpscare.style.backgroundImage = '';
}

export function showDeathScreen(onRespawn, checkpointAvailable, onNewGame) {
    deathOverlay.classList.add('active');
    deathOverlay.setAttribute('aria-hidden', 'false');
    respawnButton.hidden = !checkpointAvailable;
    newGameButton.hidden = !checkpointAvailable;
    respawnButton.onclick = (event) => {
        event.stopPropagation();
        onRespawn();
    };
    newGameButton.onclick = (event) => {
        event.stopPropagation();
        onNewGame();
    };
}

export function hideDeathScreen() {
    deathOverlay.classList.remove('active');
    deathOverlay.setAttribute('aria-hidden', 'true');
}
