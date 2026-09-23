const slides = [...document.querySelectorAll('.slide')];
const nextButton = document.querySelector('#next');
const growingNumber = document.querySelector('#growing-number');
let activeIndex = 0;
let growthTimer = null;
let shatterTimer = null;
let explosionTimer = null;
let physicsFrame = null;
let fragments = [];

function resetExplosion() {
  if (explosionTimer !== null) window.clearTimeout(explosionTimer);
  explosionTimer = null;

  const explosionImage = document.querySelector('.explosion-backdrop img');
  if (!explosionImage) return;

  explosionImage.style.visibility = '';
  const source = explosionImage.dataset.source || explosionImage.getAttribute('src');
  explosionImage.dataset.source = source.split('?')[0];
  explosionImage.src = `${explosionImage.dataset.source}?run=${Date.now()}`;
}

function startExplosion() {
  const explosionImage = document.querySelector('.explosion-backdrop img');
  if (!explosionImage) return;

  explosionImage.style.visibility = 'hidden';
  explosionTimer = window.setTimeout(() => {
    resetExplosion();
    explosionTimer = window.setTimeout(() => {
      explosionImage.style.visibility = 'hidden';
      explosionTimer = null;
    }, 1500);
  }, 250);
}

function addCharacterWobble() {
  document.querySelectorAll('h1, h2').forEach((heading) => {
    if (heading.classList.contains('shatter-text')) {
      heading.querySelectorAll(':scope > span').forEach((letter, letterIndex) => {
        letter.classList.add('wobble-letter');
        letter.style.setProperty('--wobble-delay', `${letterIndex * -0.07}s`);
      });
      return;
    }

    const words = heading.textContent.match(/\S+|\s+/g) || [];
    heading.textContent = '';
    words.forEach((word) => {
      if (/\s+/.test(word)) {
        heading.appendChild(document.createTextNode(word));
        return;
      }

      const wordElement = document.createElement('span');
      wordElement.className = 'wobble-word';
      [...word].forEach((character, letterIndex) => {
        const letter = document.createElement('span');
        letter.className = 'wobble-letter';
        letter.textContent = character;
        letter.style.setProperty('--wobble-delay', `${letterIndex * -0.07}s`);
        wordElement.appendChild(letter);
      });
      heading.appendChild(wordElement);
    });
  });
}

function resetShatter() {
  if (shatterTimer !== null) window.clearTimeout(shatterTimer);
  if (physicsFrame !== null) window.cancelAnimationFrame(physicsFrame);
  shatterTimer = null;
  physicsFrame = null;
  fragments.forEach(({ element }) => element.remove());
  fragments = [];

  const shatterText = document.querySelector('.shatter-text');
  if (shatterText) {
    shatterText.classList.remove('is-shattered');
    shatterText.querySelectorAll('span').forEach((letter) => {
      letter.style.visibility = '';
    });
  }
}

function simulateFragments(timestamp) {
  let moving = false;
  fragments.forEach((fragment) => {
    fragment.vy += 0.4;
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;
    fragment.rotation += fragment.spin;

    if (fragment.x <= 0 || fragment.x + fragment.width >= window.innerWidth) {
      fragment.x = Math.max(0, Math.min(fragment.x, window.innerWidth - fragment.width));
      fragment.vx *= -0.72;
      fragment.spin *= 0.9;
    }

    if (fragment.y + fragment.height >= window.innerHeight) {
      fragment.y = window.innerHeight - fragment.height;
      fragment.vy *= -0.45;
      fragment.vx *= 0.93;
      fragment.spin *= 0.88;
    }

    fragment.element.style.transform = `translate3d(${fragment.x}px, ${fragment.y}px, 0) rotate(${fragment.rotation}deg)`;
    moving ||= Math.abs(fragment.vx) > 0.08 || Math.abs(fragment.vy) > 0.08 || Math.abs(fragment.spin) > 0.08;
  });

  if (moving) physicsFrame = window.requestAnimationFrame(simulateFragments);
  else physicsFrame = null;
}

function createShatterFragments() {
  const shatterText = document.querySelector('.shatter-text');
  if (!shatterText) return;

  shatterText.classList.add('is-shattered');
  shatterText.querySelectorAll('span').forEach((letter, letterIndex) => {
    if (!letter.textContent.trim()) return;

    const box = letter.getBoundingClientRect();
    for (let pieceIndex = 0; pieceIndex < 3; pieceIndex += 1) {
      const element = document.createElement('span');
      const angle = ((letterIndex + pieceIndex) % 2 === 0 ? -1 : 1) * (0.8 + Math.random() * 0.5);
      element.className = `physics-piece piece-${pieceIndex}`;
      element.textContent = letter.textContent;
      element.setAttribute('aria-hidden', 'true');
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.fontSize = getComputedStyle(letter).fontSize;
      element.style.left = '0';
      element.style.top = '0';
      document.body.appendChild(element);

      fragments.push({
        element,
        width: box.width,
        height: box.height,
        x: box.left,
        y: box.top,
        vx: Math.cos(angle) * (8 + Math.random() * 5),
        vy: -(10 + Math.random() * 6),
        rotation: 0,
        spin: (pieceIndex - 1) * 3.5 + (Math.random() - 0.5) * 3,
      });
    }
  });

  physicsFrame = window.requestAnimationFrame(simulateFragments);
}

function startShatter() {
  resetShatter();
  if (!document.querySelector('.shatter-text')?.closest('.slide.is-active')) return;
  shatterTimer = window.setTimeout(createShatterFragments, 300);
}

function stopNumberGrowth() {
  if (growthTimer !== null) {
    window.clearInterval(growthTimer);
    window.clearTimeout(growthTimer);
    growthTimer = null;
  }
}

function startNumberGrowth() {
  if (!growingNumber) return;
  stopNumberGrowth();
  growingNumber.textContent = '';

  const addZeros = (amount, delay, next) => {
    let remaining = amount;
    const addNextZero = () => {
      growingNumber.textContent += '0';
      remaining -= 1;
      growthTimer = remaining > 0
        ? window.setTimeout(addNextZero, delay)
        : window.setTimeout(next, 1000);
    };

    addNextZero();
  };

  const addRapidZeros = () => {
    growingNumber.textContent += '0';
    growthTimer = window.setTimeout(addRapidZeros, 70);
  };

  growthTimer = window.setTimeout(() => {
    growingNumber.textContent = 'x1';
    growthTimer = window.setTimeout(() => {
      addZeros(2, 300, () => addZeros(2, 300, addRapidZeros));
    }, 1000);
  }, 1000);
}

function showSlide(index) {
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));
  stopNumberGrowth();
  resetShatter();
  resetExplosion();

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === activeIndex);
  });

  if (document.querySelector('.shatter-text')?.closest('.slide.is-active')) {
    startShatter();
    startExplosion();
  }

  nextButton.disabled = activeIndex === slides.length - 1;
  if (activeIndex === slides.length - 1) startNumberGrowth();
}

function moveSlide(direction) {
  showSlide(activeIndex + direction);
}

nextButton.addEventListener('click', () => moveSlide(1));

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') moveSlide(-1);
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault();
    moveSlide(1);
  }
});

let wheelLocked = false;
document.addEventListener('wheel', (event) => {
  if (wheelLocked || Math.abs(event.deltaY) < 12) return;

  wheelLocked = true;
  moveSlide(event.deltaY > 0 ? 1 : -1);
  window.setTimeout(() => { wheelLocked = false; }, 550);
}, { passive: true });

let touchStartX = 0;
document.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });
document.addEventListener('touchend', (event) => {
  const distance = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(distance) > 50) moveSlide(distance < 0 ? 1 : -1);
}, { passive: true });

addCharacterWobble();
showSlide(0);
