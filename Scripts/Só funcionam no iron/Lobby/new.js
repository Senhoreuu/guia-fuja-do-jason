`use strict`;

const wait = (callback, ticks, cache = false) => {
    const delay = Delay.interval(() => {
        Delay.cancel(delay);
        callback();
        if (cache) game.intervals.delete(delay);
    }, ticks);

    if (cache) game.intervals.add(delay);

    return delay;
};

const room = {
    users_map: new Map(),
    users: {},
    podium: [],
    // promoterDelay: null,
    bot: Faker.createFakePlayer('Jason', 0, 0, 0, 0)
};

const badges = {
    badgeWin: 'FRE88',
    // badgeWin: 'IT945',
    badgeJason: 'IT239',
    badgePromoter: 'GMS12'
};

const game = {
    start: false,
    spectator: false,
    players: {},
    win: 0,
    promoter: {
        id: 0,
        player: null
    },
    timer: 13 * 60, // in seconds
    stage: 0,
    deads: 0,
    intervals: new Set(),
    hasWinners: false,
    jasons: [],
    winners: new Set(),
    playersCount: 0
};

const rooms = ['889766', '889799', '889823', '889837', '889873', '889904', '892636', '893095', '893118', '893132', '893148', '893454', '893458', '893728', '893958', '899867', '899870', '907232', '907233', '912756', '913470', '913593', '913961', '914166', '914201', '915048', '915847', '924104', '996225'];

const roomNot = (icon, message) => room.users_map.forEach(e => {
    try {
        e.notification(icon, message);
    }
    catch (e) { }
});

const isStaff = (user) => user.hasBadge(badges.badgePromoter);
const isJason = (user) => game.players[room.users[user] ? room.users[user].id : user.getId()].isJason;

const updateRooms = (data) => rooms.forEach(roomId => Events.sendMessageToRoom(Number(roomId), 'updateRoom', JSON.stringify(data)));

const createNewStorageData = user => {
    const data = room.users[user];

    if (game.players[data.id]) {
        game.players[data.id].name = data.name;
        game.players[data.id].spectator = false;

        if (Object.keys(game.players[data.id].following).length) {
            const followers = Object.values(game.players[data.id].followers);
            if (followers.length) {
                followers.forEach(data => {
                    const room = Number(GlobalStorage.get(`playerInRoom:${data.name}`)) || 924213;

                    Events.sendMessageToRoom(room, 'getFollower', JSON.stringify({ follower: data.id, room: 924213 }));
                });
            }

            const target = game.players[data.id].following.id;
            user.notification('WEEN', `Você parou de seguir ${game.players[data.id].following.name}.`);
            delete game.players[target].followers[data.id];
        }

        game.players[data.id].following = {};
        game.players[data.id].followers = {};
    }
    else {
        game.players[data.id] = {
            name: data.name,
            entry: 0,
            kills: 0,
            deads: 0,
            wins: 0,
            isJason: false,
            spectator: false,
            following: {},
            followers: {},
            diedOf: 'Ainda não foi eliminado(a)!'
        };
    }

    save();
};

const getJasons = () => {
    return Object.entries(game.players)
        .filter(([key, player]) => player.isJason)
        .map(([key]) => game.players[key].name);
};

const getJasonNames = () => {
    const jasons = getJasons();

    if (!jasons.length) return '';

    return jasons.join(', ');
};

// Adiciona e Remove Promotores
const setStaff = (user, message) => {
    message = message.split(' ')[1];

    const player = Room.getPlayerByName(message);

    if (!room.users[player]) {
        user.message('Usuário não encontrado.', 3);
        return;
    }

    if (isStaff(player)) {
        user.message(`O usuário ${message} foi removido da Staff!`, 23);
        player.removeBadge(badges.badgePromoter);
        player.alertLong(`Você não é mais um Membro da Equipe do Fuja do Jason!`);
        player.gotoRoom(924213);
    }
    else {
        user.message(`O usuário ${message} foi adicionado na Staff!`, 23);
        player.giveBadge(badges.badgePromoter);
        player.alert('Você é um Membro da Equipe do Fuja do Jason!');
    }
};

const setJason = (user, message) => {
    const args = message.split(' ');
    message = args[1];

    let player = Room.getPlayerByName(message);

    if (!room.users[player] && !args.includes('force')) {
        user.message('Usuário não encontrado.', 3);
        return;
    }
    else if (args.includes('force')) {
        const globalId = GlobalData.getPlayerDataByName(message)?.getId();
        if (!globalId) {
            return user.message(`${message} não existe!`, 23);
        }
        game.players[globalId].isJason = false;
        return user.message(`O usuário ${message} foi removido dos Jason!`, 23);
    }

    const id = room.users[player].id;

    if (isJason(player)) {
        game.players[id].isJason = false;
        user.message(`O usuário ${message} foi removido dos Jason!`, 23);
        player.alertLong(`Você foi removido dos Jason!`);
        player.teleport(8, 20, 0, 0);
        player.removeEffect();

        const index = game.jasons.indexOf(ids => ids === id);

        if (index) {
            game.jasons.splice(index, 1);
        }

        deleteMask(player);
    }
    else {
        game.players[id].isJason = true;
        user.message(`O usuário ${message} é um Jason agora!`, 23);
        player.alertLong('Você foi convocado para ser um Jason!\n\n' + help(user));
        game.jasons.push(id);

        Wired.trigger('jasonJoined', player);

        checkVisual(player);
    }

    save();

    if (game.start) {
        updateRooms(game.players);
    }
};

const randomJason = (user) => {
    let players = [...room.users_map.keys()].filter(key => !game.players[key].isJason);
    let randomIndex = Math.floor(Math.random() * players.length);
    let player = room.users_map.get(players[randomIndex]);

    if (!player) {
        return user.message('Não foi possível realizar o comando!', 23);
    }

    user.say('Escolhendo um jogador aleatório para ser um Jason!', true, 9);

    wait(() => {
        let executions = 0;
        while (!room.users_map.has(players[randomIndex]) && executions < 10) {
            executions++;
            players = [...room.users_map.keys()].filter(key => !game.players[key].isJason);
            randomIndex = Math.floor(Math.random() * players.length);
            player = room.users_map.get(players[randomIndex]);
        }

        if (executions === 10) {
            return user.message('Não foi possível realizar o comando!', 23);
        }

        user.say(`${player.getUsername()} foi escolhido!`, true, 9);
    }, 2);
};

const removeRandomJason = (user) => {
    user.say('Escolhendo um Jason aleatoriamente para ser escolhido!', true, 9);
    const [jason] = [...getJasons()].sort(() => Math.random() - 0.5);
    user.message(`${jason} será escolhido!`, 9);

    wait(() => {
        user.say(`${jason} foi escolhido!`, true, 9);
    }, 2, true);
};

const convertFigure = (visual) => {
    const figure = visual ? visual : user.getFigure();
    const parts = figure.split('.');
    while (parts.findIndex(data => data.includes('fa')) >= 0) {
        const index = parts.findIndex(data => data.includes('fa'));

        if (index >= 0) {
            parts.splice(index, 1);
        }
    }

    return parts.join('.');
};

const checkVisual = (user, deleteTheMask = false) => {
    if (!game.players[room.users[user].id].isJason) {
        user.message('Necessário ser um jason!', 3);
        return;
    }

    let figure = user.getFigure();
    const parts = figure.split('.');
    const hasFa = parts.includes('fa');
    const hasVisual = parts.toString().split('-').includes('987462884');

    if (!hasVisual) {
        figure = hasFa ? convertFigure(figure) : `${figure}.fa-987462884-1368`;

        user.setFigure('M', figure);
    }
    else if (deleteTheMask) {
        deleteMask(user, figure);
    }
};

// Método para remover a máscara
const deleteMask = (user, visual) => {
    const figure = visual ? visual : user.getFigure();
    const parts = figure.split('.');
    while (parts.findIndex(data => data.includes('fa')) >= 0) {
        const index = parts.findIndex(data => data.includes('fa'));

        if (index >= 0) {
            parts.splice(index, 1);
        }
    }

    user.setFigure('M', parts.join('.'));
};

// Define total de vencedores
const setWin = (user, message) => {
    const arg = message.split(` `)[1];
    const win = Number(arg);
    if (!win) return user.message('Use somente números!', 11);
    if (win > 0 && win < 7) {
        game.win = win;
        user.message(`${win} vencedores foram definidos!`, 11);
    }
    else user.message('Defina entre 1 a 6 vencedores!', 11);
};

const removePlayersInTeleports = () => Wired.trigger('removePlayers');

const start = (user) => {
    if (!game.win) {
        user.message('Defina quantos vencedores terão! Use: :wins %qnt%', 11);
        return;
    }

    game.playersCount = 0;

    game.start = true;

    Wired.trigger('getParticipants');

    Wired.setMemoryValue('time', game.timer);
    Wired.trigger('startTime');
    Wired.trigger('openDoorsRunners');

    room.bot.say('Evento iniciado. As portas se fecharão em 2 minutos e a porta dos Jason se abrirá em 1 minuto!', true, 9);

    const ids = Object.keys(room.users_map);
    ids.forEach(id => game.players[id].entry++);

    wait(endAll, Delay.seconds(game.timer), true);

    wait(warningRunners, 120, true);

    const time = game.timer;

    const interval = Delay.interval(() => {
        game.timer--;

        if (game.timer === 0) {
            endAll();
            return;
        }

        if (game.timer === time - 120) {
            Wired.trigger('closeDoorsRunners');
        }

        if (game.timer > time - 180) return;

        const roomsSize = game.playersCount;

        if (roomsSize <= game.win && roomsSize > 0) {
            if (game.hasWinners)
                endAll();
            else
                game.hasWinners = true;
        }
        else if (roomsSize <= 0) {
            endAll();
        }
    }, 2);

    game.intervals.add(interval);
};

const warningRunners = () => {
    game.spectator = true;

    room.bot.say('Os Jason foram liberados. As portas se fecharão em 1 minuto!', true, 9);

    const warning = 'Atenção Runners: Os Jason foram liberados.';

    sendMessageToRooms(false, warning);

    Wired.trigger('openDoor');

    wait(() => Wired.trigger('closeDoorsRunners'), 120, true);
};

// Finaliza
const endAll = () => {
    rooms.forEach((roomId) => Events.sendMessageToRoom(Number(roomId), 'back', '{}'));

    if (game.playersCount > 0) {
        room.bot.say(`Tivemos o total de: ${game.playersCount} vencedores! Total de Mortes: ${game.deads}!`, true, 9);
    }

    reset();
};

// Reset
const reset = (user) => {
    Wired.trigger('reset');

    game.timer = 13 * 60;
    game.win = 0;
    game.deads = 0;
    game.stage = 0;
    game.hasWinners = false;
    game.start = false;
    game.spectator = false;
    game.playersCount = 0;

    cancelIntervals();
    removePlayersInTeleports();

    if (user) {
        user.message('Resetado!', 9);
    }
};

const cancelIntervals = () => {
    game.intervals.forEach(delay => Delay.cancel(delay));
    game.intervals.clear();
};

// Recebe Notificações
const getServeMessages = (roomId, event, data) => {
    data = JSON.parse(data) || data;
    switch (event) {
        case 'kill':
            roomNot('JASON', `${data.target} foi eliminado pelo Jason ${data.user}!`);

            game.players[data.targetId].diedOf = `Eliminado(a) pelo Jason ${data.user}!`;
            break;
        case 'cannon':
            roomNot('KILL', `${data.user} eliminou ${data.target} no canhão!`);

            game.players[data.targetId].diedOf = `Eliminado(a) no canhão por ${data.user}!`;
            break;
        case 'kys':
            roomNot('GHOST', `${data.user} eliminou a si mesmo!`);

            game.players[data.targetId].diedOf = `Eliminou a si mesmo!`;
            break;
        case 'winner':
            roomNot('JASON', `${data.user} conseguiu escapar dos Jason!`);

            game.players[data.id].wins++;
            game.winners.add(data.id);
            break;
        case 'updateCountPlayers':
            if (!game.start) {
                Events.sendMessageToRoom(roomId, 'back', '{}');
                return;
            }

            game.playersCount += Number(data);

            if (game.playersCount > 0) return;

            game.playersCount = 0;
            return;
        default:
            Engine.log(data);
            return;
    }

    if (['kill', 'cannon', 'kys'].includes(event)) {
        game.deads++;
        game.players[data.targetId].deads++;
    }

    if (['kill', 'cannon'].includes(event)) {
        game.players[data.id].kills++;
        setPodium(data.id);
    }

    save();
};

// Enviar Notificações
const sendMessageToRooms = (user, message) => {
    if (user) {
        message = message.split(' ');
        if (!message[1]) return user.message('Defina uma mensagem.', 3);
        message.shift();
        message = message.join(' ');
    }

    rooms.forEach(roomId => Events.sendMessageToRoom(Number(roomId), 'not', JSON.stringify({ message })));

    room.users_map.forEach(entity => entity.notification('WEEN', message));
};

const staffChair = (user) => {
    if (isStaff(user)) {
        const data = room.users[user];
        if (room.users_map.size < 10) {
            return user.message('Você só pode iniciar uma cota com 10 ou mais jogadores no quarto!', 23);
        }

        game.promoter.id = data.id;
        game.promoter.player = user;

        user.message('Use :comandos para saber os comandos de controle!', 23);

        sendMessageToWebhook('Cota iniciada', `${data.name} iniciou uma cota! com ${room.users_map.size} usuários no quarto!`);
        Wired.trigger('moveToChair', user);
    }
    else {
        user.message('Apenas Promotores podem acessar a cadeira!', 23);
    }
};

const help = (user) => {
    const msg = isJason(user) ?
        'Você é um(a) Jason!\n Seu objetivo é correr até atrás dos usuários! OBS: Não é possível matar os Corredores no quarto principal\n\nPara matar alguém, basta clicar no avatar do corredor estando encostado nele!\n\nRegras:\n1°: O usuário não pode ser kikado na animação do teletransporte!\n2°: Quando a caçada terminar, não é permitido continuar expulsando usuários!\n3°: É necessário esperar 2 minutos após a entrada dos usuários para poder matar os usuários.' :
        'Bem-vindo(a) ao Fuja do Jason!\n\nSeu objetivo é fugir do Jason passando pelos teletransportes e se escondendo! Os Runners entram primeiro que os Jason! Quando se passar 2 minutos da entrada dos Runners os Jason entrarão! Após 4 minutos, ninguém consegue voltar mais depois de morrer! Caso você volte para o teletransporte inicial (lobby), se houver lobos, tenha cuidado, eles matarão você!';

    return msg;
};

// Mostra listas
const showList = (user) => {
    const allUsers = game.playersCount;
    const registers = Object.keys(game.players).length;
    const jasons = getJasonNames();

    user.alertLong(`Jasons: ${jasons}\n\nTotal de Runners: ${allUsers}\n\nTotal de mortes: ${game.deads}\n\nTotal de Vencedores setados: ${game.win}\n\nJogadores registrados: ${registers}`);
};

const showProfile = (user, message) => {
    let name = message.split(' ')[1];
    if (!name) {
        name = room.users[user].name;
    }

    const id = GlobalData.getPlayerDataByName(name)?.getId();

    if (!id) return user.message('Perfil não encontrado!');

    const data = game.players[id];

    user.alertLong(`Perfil de ${data.name}\n\nEliminou: ${data.kills} corredor(es)\n\nParticipou: ${data.entry} vez(es)\n\nVenceu: ${data.wins} vez(es)\n\nMorreu: ${data.deads} vez(es)\n\nÚltima morte: ${data.diedOf}`);
};

const steped = (user, furni) => {
    const sprite = furni.getSprite();
    const id = room.users[user].id;

    if (sprite === 3370) {
        if (!game.players[id].isJason) return;

        user.teleport(9, 9, 0, 2);
        user.message('Os jason só entram pela porta preta disponibilizada na ADM!', 23);
    }

    if (sprite === 718908) {
        if (!game.players[id].isJason)
            user.teleport(9, 9, 0, 2);
        else {
            checkVisual(user);
            user.teleport(17, 8, 0, 2);
        }
    }
};

const warnRooms = (user, message) => {
    message = message.split(' ');

    if (!message[1]) {
        user.message('Digite um alerta!', 23);
        return;
    }

    message.shift();

    const warnMessage = message.join(' ');
    sendMessageToRooms(false, warnMessage);
    user.message('Uma notificação foi enviada para os jogadores!', 23);
};

const join = user => {
    const id = room.users[user] ? room.users[user].id : user.getId();

    if (!room.users[user]) {
        room.users[user] = {
            name: user.getUsername(),
            id,
        };

        createNewStorageData(user);

        room.users_map.set(id, user);
    }

    if (game.winners.has(id)) {
        game.winners.delete(id);
        user.giveBadge(badges.badgeWin);
        Highscores.add(user, 1);
        sendMessageToWebhook('Escapou do Jason', `${room.users[user].name} venceu.`, 238385, 'vencedores');
    }

    const staff = isStaff(user);
    const jason = isJason(user);

    if (jason) {
        Wired.trigger('jasonJoined', user);
    }
    else if (staff) {
        user.teleport(9, 9, 0, 2);
        wait(() => user.message('Diga :cadeira para poder comandar!', 23), 3);

        if (id === game.promoter.id) {
            game.promoter.id = 0;
            game.promoter.player = null;
            sendMessageToWebhook('Cota Finalizada', `${room.users[user].name} finalizou a cota ao dar :fila.`, 16711680);
        }
    }
    else {
        user.teleport(8, 20, 0, 0);
        user.message(`Bem-vindo(a) a central do Fuja do Jason, ${room.users[user].name}! Diga :help para saber como funciona!`, 9);
    }
};

const leave = (id, username) => {
    if (id === game.promoter.id) {
        game.promoter.id = 0;
        game.promoter.player = null;
        sendMessageToWebhook('Cota Finalizada', `${username} finalizou a cota ao sair do quarto.`, 16711680);
    }

    delete room.users[room.users_map.get(id)];
    room.users_map.delete(id);
};

const load = () => {
    getSave();
    reset();
    loadPodium();

    room.bot.teleport(12, 13, 0.1, 2);
    room.bot.setFigure('m', 'hd-990000447-1012-1012.fa-987462884-1368.he-989999972-62.ea-1402-62.ch-9941044-109.sh-990000116-1195-73.cc-990000512-1198.lg-9587209-1195-92');
    Object.values(badges).forEach(str => room.bot.addBadge(str));
    room.bot.setMotto('Equipe Jason.');

    Wired.trigger('reset');

    if (game.jasons.length) {
        const ids = Object.entries(game.players)
            .filter(([key, player]) => player.isJason)
            .map(([key]) => key);

        ids.forEach(id => game.players[id].isJason = false);

        game.jasons = [];
    }
};

const sendMessageToWebhook = (title, description, color = 6591981, log = 'cotas') => {
    const urls = {
        'cotas': 'https://discord.com/api/webhooks/1128370236056420513/jvJk8W27QgVjFJlMmohJnURP8y1jp63N3FYPlV8cBdWHFt8ayfuiWz5fgHqhYQh3i-Gf',
        'vencedores': 'https://discord.com/api/webhooks/1129842226709663744/82mDzFyfySnWWj4fpS5DrgUxbPT0FQb8ll6qJwn75T2BcbXuPKVLiIGHHS3XJE7ob4Yh'
    };

    const url = urls[log];

    Webhook.sendTo(url)
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .queue();
};

const fakes = {
    1: null,
    2: null,
    3: null
};

const enablesPodium = {
    1: 111,
    2: 110,
    3: 109
};

const posFakes = [
    { x: 29, y: 3, z: 1.8, r: 4 },
    { x: 30, y: 3, z: 1.2, r: 4 },
    { x: 28, y: 3, z: 0.7, r: 4 }
];

const createBot = (index, data, botPos) => {
    let player = fakes[index];

    if (!player || player.getUsername() !== data.name) {
        if (player) Faker.removeEntity(player);

        player = Faker.createFakePlayer(data.name, botPos.x, botPos.y, botPos.z, 0);
        fakes[index] = player;
    }

    player.teleport(botPos.x, botPos.y, botPos.z, botPos.r);
    player.setMotto(`${data.name} já eliminou ${data.points} ${data.points === 1 ? 'Runner' : 'Runners'}!`);
    player.setFigure('m', data.figure);
    player.setEffect(enablesPodium[index]);
    player.addBadge(badges.badgeWin);
};

const loadPodium = () => {
    for (let i = 0; i < 3; i++) {
        const position = room.podium[i];

        if (!position) break;

        const botPos = posFakes[i];
        const index = i + 1;
        createBot(index, position, botPos);
    }

    save();
};

const getGlobalData = (id) => {
    const globalData = GlobalData.getPlayerDataById(id);

    return { name: globalData.getUsername(), figure: globalData.getFigure() };
};

const setPodium = (id) => {
    const data = getGlobalData(id);
    const index = room.podium.findIndex(data => data.id == id);

    if (index >= 0) {
        room.podium[index].points++;
        room.podium[index].name = data.name;
        room.podium[index].figure = data.figure;
    }
    else room.podium.push({
        id: id,
        name: data.name,
        figure: data.figure,
        points: 1
    });

    room.podium = room.podium.sort((a, b) => b.points - a.points);

    loadPodium();
};

const save = () => {
    GlobalStorage.set('joinedInGame-Jason', JSON.stringify(game.players));
    GlobalStorage.set('jasonPodium-jason', JSON.stringify(room.podium));
    GlobalStorage.set('jasons', JSON.stringify(game.jasons));
};

const getSave = () => {
    game.players = JSON.parse(GlobalStorage.get('joinedInGame-Jason')) || {};
    room.podium = JSON.parse(GlobalStorage.get('jasonPodium-jason')) || [];
    game.jasons = JSON.parse(GlobalStorage.get('jasons')) || [];
};

const podiumSettings = (user, message) => {
    const args = message.split(' ');
    if (args.includes('clear')) {
        room.podium = [];
        GlobalStorage.set('jasonPodium-jason', JSON.stringify(room.podium));
        Object.values(fakes).forEach(fake => {
            if (fake) {
                Faker.removeEntity(fake);
            }
        });

        fakes[1] = null;
        fakes[2] = null;
        fakes[3] = null;
    }

    if (args.includes('set')) {
        setPodium(user.getId());
    }
};

const clearScore = (user, message) => {
    if (!message.includes('confirm')) {
        return user.message('Para continuar, use :clearscore confirm', 23);
    }

    endAll();
    reset();

    game.players = {};
    game.jasons = [];

    Wired.trigger('clearscore');
    save();

    user.message('Tudo foi limpo com sucesso!', 23);
};

// Events
Events.on('load', load);
Events.on('serverMessage', getServeMessages);
Wired.on('userJoin', join);
Events.on('userLeave', leave);

Commands.register(':fila', true, join);

Commands.register(':help', true, user => {
    user.alertLong(help(user));
});

Commands.register(':perfil', true, showProfile);
Commands.register(':lista', true, showList);
Commands.register(':mask', true, (user) => {
    checkVisual(user, true);
});

Wired.on('movePlayerToChair', staffChair);

Wired.on('isStaff', user => {
    if (!isStaff(user) && !isJason(user)) {
        user.message('Você não é um membro da equipe!', 23);
        user.teleport(8, 20, 0, 0);
    }
});

Wired.on('isJason', user => {
    if (isJason(user)) {
        user.message('Você é um Jason! Você só pode entrar pela porta preta.', 23);
        user.cancelWalk();
        user.teleport(9, 10, 0, 2);
    }
});

Wired.on('ifIsJasonTeleport', user => {
    if (!isJason(user)) {
        user.message('Você não é um Jason!', 23);
        user.cancelWalk();
        user.teleport(9, 10, 0, 2);
    }
    else {
        user.setEffect(5000);
        user.teleport(20, 8, 0, 0);
    }
});

Wired.on('removePlayer', user => {
    if (isJason(user) || isStaff(user)) {
        user.teleport(9, 9, 0, 2);
    }
    else user.teleport(8, 20, 0, 0);
});

Wired.on('showCommands', (user) => {
    const commands_register = '\nComandos de Registros:\n:ev - Registra a cota no log. (Exemplo: :ev)\n';
    const commands_event = '\nComandos de Funcionamento do Evento:\n:warn %message% - Envia um alerta para todos os quartos do Jason. (Exemplo: :warn Os jason foram liberados!)\n:start - Inicia o Fuja. (Exemplo: :start)\n:wins %qnt% - Define o tanto de vencedores. (Exemplo: :wins 10)\n:reset - Redefine o Evento. (Exemplo: :reset)\n:finalizar - Traz todos os jogadores de volta ao lobby e finaliza o evento. (Exemplo: :finalizar)\n:time - Define quanto tempo terá o evento (Requer permissão). (Exemplo: :time %tempo em minutos%)\n';
    const commands_jason = '\nComandos aos Jason:\n:jason - Seta um novo Jason ou Remove um Jason (caso seja um Jason). (Exemplo: :jason <nome do jogador>)\n:removeJason - Escolhe aleatoriamente um Jason para ser removido! (Exemplo: :rndJason)\n:rndJason - Escolhe aleatoriamente um usuário para ser um Jason! (Exemplo: :rndJason)\n';

    user.alertLong('Comandos do Fuja\n' + commands_register + commands_event + commands_jason);
});

Wired.on('jasonJoinedInTeleport', (user) => {
    if (isJason(user)) {
        Wired.trigger('jasonJoined', user);
    }
});

// Commands Senhoreu
const Command = (command, start, callback) => {
    const execute = (user, message) => {
        if (room.users[user].name === 'Senhoreu' || room.users[user].name === Room.getOwnerUsername()) callback(user, message);
    }

    Commands.register(command, start, execute);
};

Command(':staff', true, setStaff);
Command(':podium', true, podiumSettings);
Command(':clearScore', true, clearScore);
// Commands Promoter
const Promoter = (command, start, callback) => {
    const execute = (user, message) => {
        if (room.users[user].id === game.promoter.id || room.users[user].name === 'Senhoreu' || room.users[user].name === Room.getOwnerUsername()) callback(user, message);
    }

    Commands.register(command, start, execute);
};

Promoter(':start', true, start);
Promoter(':finalizar', true, endAll);
Promoter(':reset', true, reset);
Promoter(':wins', true, setWin);
Promoter(':warn', true, warnRooms);
Promoter(':rndJason', true, randomJason);
Promoter(':removeJason', true, removeRandomJason);
Promoter(':jason', true, setJason);

Wired.on('sendParticipant', (user) => {
    game.players[room.users[user].id].entry++;
});