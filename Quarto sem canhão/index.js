// room-jason

const wait = (callback, ticks) => {
  const delay = Delay.interval(() => {
    Delay.cancel(delay);
    callback();
  }, ticks);

  return delay;
};

const roomId_ = Room.getId();

const room = {
  users: new Map(),
  users_info: {},
  spectators: new Map()
};

const game = {
  effectDead: 25,
  bubbleKill: 32,
  bubbleJason: 9,
  players: {},
  waitCannon: new Set(),
  immunes: new Set()
};

Commands.register(':stun', true, user => {
  const allRotations = (data) => [
    { x: data.x, y: data.y - 1 },
    { x: data.x + 1, y: data.y - 1 },
    { x: data.x + 1, y: data.y },
    { x: data.x + 1, y: data.y + 1 },
    { x: data.x, y: data.y + 1 },
    { x: data.x - 1, y: data.y + 1 },
    { x: data.x - 1, y: data.y },
    { x: data.x - 1, y: data.y - 1 },
  ];

  const coord = { x: user.getX(), y: user.getY() };
  const direction = user.getR();
  const distance = 2;

  for (let i = 0; i < distance; i++) {
    const next = allRotations(coord)[direction];
    const [target] = Room.getEntitiesByCoord(next.x + i, next.y + i).sort(() => Math.random() - 0.5);

    if (!target || game.immunes.has(room.users_info[target].id)) return;

    target.setCanWalk(false, false);
    target.setEffect(53);
    target.sit();
    target.say('*Atordoado*', true, 9);

    wait(() => {
      if (!room.users_info[target]) return;

      target.setCanWalk(true, false);

      if (game.players[room.users_info[target].id].isJason) {
        user.setEffect(441);
      }
      else {
        target.removeEffect();
      }
    }, 4);
  }
});

const joined = (user) => {
  const name = user.getUsername();

  if (name !== 'Senhoreu' && user.hasRank(7)) {
    user.notification('STAFF', "Staff's não podem jogar mais o Fuja do Jason. Favor, entre na sua conta User.");
    user.gotoRoom(924213);
    return;
  }

  const id = user.getId();

  if (game.players[id].spectator) {
    room.spectators.set(id, user);
    return Wired.trigger('spec', user);
  }

  Wired.trigger('teleportToRoom', user);

  room.users.set(id, user);
  room.users_info[user] = { id, name };

  const followers = Object.values(game.players[id].followers);
  if (followers.length) {
    followers.forEach(data => {
      const room = Number(GlobalStorage.get(`playerInRoom:${data.name}`)) || 924213;

      Events.sendMessageToRoom(room, 'getFollower', JSON.stringify({ follower: data.id, room: roomId_ }));
    });
  }

  if (game.players[id].isJason) {
    user.message('Vá atrás dos corredores!', 9);
    user.setEffect(441);

    const filtered = [...room.users.keys(room.users)].filter(key => !game.players[key].isJason);

    if (filtered.length) {
      user.notification('JASON', `Atenção Jason, possuem ${filtered.length} corredores no quarto!`);
    }

    Wired.trigger('sfx');
  }
  else {
    Events.sendMessageToRoom(924213, 'updateCountPlayers', '1');

    if (!game.immunes.has(id)) {
      user.setEffect(571);
      user.message('Você está imune aos Jason por 4 segundos!', 9);

      game.immunes.add(id);

      wait(() => game.immunes.delete(id), 20);
      wait(() => user.removeEffect(), 8);
    }
  }
};

const onPlayerSelected = (user, target) => {
  if (!user.touching(target)) return;

  const targetId = room.users_info[target].id;

  if (game.players[targetId].isJason) return;

  const targetEffect = target.getEffect();

  if (targetEffect === game.effectDead || targetEffect === 571) return;

  const id = room.users_info[user].id;

  if (!game.players[id].isJason) return;

  const userName = room.users_info[user].name;
  const targetName = room.users_info[target].name;

  target.say(`Fui eliminado(a) por ${userName}`, true, game.bubbleKill);
  target.setEffect(game.effectDead);

  target.setCanWalk(false, false);
  wait(() => target.gotoRoom(924213), 1);

  user.progressAchievement('ACH_PlusJason', 1);
  Highscores.add(user, 1);

  Events.sendMessageToRoom(
    924213,
    `kill`,
    JSON.stringify({ user: userName, target: targetName, id, targetId })
  );
};

const stepped = (user) => {
  user.setCanWalk(false, false);

  wait(() => {
    user.setCanWalk(true, false);
    user.removeEffect();
  }, 4);

  const id = room.users_info[user] ? room.users_info[user].id : user.getId();
  if (game.immunes.has(id) || game.players[id].isJason) return;
  user.setEffect(571);

  wait(() => {
    user.setCanWalk(true, false);
  }, 2);
};

const getSave = () => {
  game.players = JSON.parse(GlobalStorage.get('joinedInGame-Jason')) || {};
};

// server information
const getLog = (roomId, event, data) => {
  data = JSON.parse(data);

  switch (event) {
    case 'not':
      room.users.forEach((user) => user.notification('JASON', data.message));
      break;
    case 'updateRoom':
      getSave();
      break;
    case 'back':
      const keys = [...room.users.keys()];
      keys.forEach((id) => {
        const user = room.users.get(id);
        user.cancelWalk();
        if (game.players[id].isJason) {
          user.notification('JASON', 'Fim do Evento!');
        }
        else {
          Events.sendMessageToRoom(924213, 'winner', JSON.stringify({ user: user.getUsername(), id }));
          user.notification('JASON', 'Parabéns, você venceu!');
        }
        user.gotoRoom(924213);
      });

      room.spectators.forEach(spec => spec.gotoRoom(924213));
      break;
    case 'getFollower':
      Room.getPlayerById(data.follower)?.gotoRoom(Number(data.room));
      break;
    default:
      Engine.log(event);
      break;
  }
};

const load = () => {
  getSave();
};

// Eventos
Events.on('playerSelected', onPlayerSelected);
Wired.on('teleportStep', stepped);
Events.on('serverMessage', getLog);
Events.on('userJoin', joined);
Events.on('load', load);

Events.on('userJoin', (user) => GlobalStorage.set(`playerInRoom:${user.getUsername().toLowerCase()}`, roomId_));

Events.on('say', (user, message) => {
  if (message.startsWith('@')) {
    const arg = message.split('@')[1];
    const name = arg.split(' ')[0];
    const phrase = message.split(`@${name} `)[1];

    if (!name || !phrase) return;

    const roomId = Number(GlobalStorage.get(`playerInRoom:${name.toLowerCase()}`));

    if (!roomId) {
      return;
    }

    user.message(`Menção enviada para ${name}`);

    Events.sendMessageToRoom(roomId, 'mention', JSON.stringify({ handler: user.getUsername(), target: name, phrase }));
  }
});

Events.on('serverMessage', (roomId, event, data) => {
  if (event === 'mention') {
    data = JSON.parse(data);
    Room.getPlayerByName(data.target)?.message(`${data.handler} lhe enviou uma mensagem: ${data.phrase}`);
  }
});

Events.on('userLeave', (id) => {
  if (!room.users.has(id)) {
    room.users.delete(id);
  }
  else {
    room.spectators.delete(id);
  }

  if (game.players[id].isJason) return;

  Events.sendMessageToRoom(924213, 'updateCountPlayers', '-1');
});

Commands.register(':clear', true, (user, message) => {
  const [highscore] = Room.getAllFurnisBySpriteId(712126);

  Highscores.clear(highscore);
});