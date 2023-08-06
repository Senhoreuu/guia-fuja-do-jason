let rooms_name = [];
let cards = [];
let tree = {};

function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function createTree(event) {
    const id = event.currentTarget.id;
    console.log(id);
    if (!rooms_name.includes(id)) return;
    const connections = tree[id].rooms;

    const div = document.createElement('div');
    div.classList.add('card-tree');
}

function createCard(room) {
    const div = document.createElement('div');
    div.classList.add('card');
    div.addEventListener('click', createTree);
    div.setAttribute('data-aos', 'fade');
    div.setAttribute('id', room.id);

    const title = document.createElement('h2');
    title.textContent = room.room_name;

    const img = document.createElement('img');
    img.setAttribute('loading', 'lazy');
    img.classList.add('img');
    img.src = room.link;

    div.appendChild(title);
    div.appendChild(img);

    return div;
}

async function loadRooms() {
    try {
        const response = await fetch('./Rooms/rooms.json');
        const data = await response.json();
        const prefix = (name) => `./images/${name}.png`;

        const rooms = data.rooms.map((room) => {
            const room_name = room.room_name;
            const normalized = normalize(room_name);
            const link = prefix(normalized.toLowerCase());

            return {
                id: normalized.toLowerCase(),
                room_name: room_name,
                link: link,
            };
        });

        return rooms;
    } catch (error) {
        console.error('Error: ', error);
        return [];
    }
}

function showCardsOnScroll() {
    const cards = document.querySelectorAll('div.card');
    cards.forEach((card) => {
        if (isElementInViewport(card)) {
            card.classList.add('show');
        }
    });
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom - 300 <= (window.innerHeight || document.documentElement.clientHeight);
}

function filterCards(searching) {
    const cards = document.querySelectorAll('div.card');
    const normalizedSearching = searching.toLowerCase();

    cards.forEach((card) => {
        const cardId = card.id.toLowerCase();
        if (cardId.includes(normalizedSearching)) {
            card.classList.add('show');
            card.classList.remove('hide');
        } else {
            card.classList.add('hide');
            card.classList.remove('show');
        }
    });
}

function showAllCards() {
    const cards = document.querySelectorAll('div.card');
    cards.forEach((card) => {
        card.classList.remove('hide');
        card.classList.add('show');
    });
}

async function initApp() {
    const rooms = await loadRooms();
    const article = document.querySelector('article');

    await fetch('./Rooms/ways_tree.json')
        .then(response => response.json())
        .then(data => tree = data);

    rooms.forEach((room) => {
        rooms_name.push(room.id);
        const card = createCard(room);
        cards.push(card);
        article.append(card);
    });

    setTimeout(showCardsOnScroll, 1000);
    document.addEventListener('scroll', showCardsOnScroll);
}

const footer = document.querySelector('footer');

document.querySelector('#search').addEventListener('input', (input) => {
    const searchText = input.target.value.trim();
    if (searchText === "") {
        footer.classList.remove('hide');
        showAllCards();
    }
    else {
        footer.classList.add('hide');
        filterCards(searchText);
    }
});

initApp();