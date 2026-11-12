import { TCaptain } from '../types/index.js';

// export async function getPlayersList(page?: number): Promise<ResponseCaptains> {
//   const data = await client
//     .post('captains', {
//       json: {
//         page,
//       },
//     })
//     .json<ResponseCaptains>();

//   return {
//     captains: data?.captains ?? [],
//     page: data.page ?? 0,
//   };
// }

export async function getCaptainsListMock(): Promise<TCaptain[]> {
  /**
    JG.repeat(5, 10, {
      id: JG.objectId(),
      nickname: JG.loremIpsum({units: 'words', count: 1}),
      name: JG.loremIpsum({units: 'words', count: 1}),
      surname: JG.loremIpsum({units: 'words', count: 1}),
      avatar: JG.integer(100, 1000),
      totalGames: JG.integer(50, 100),
      wonGames: JG.integer(0, 50),
      draws: JG.integer(0, 30),
      lostGames: JG.integer(0, 50),
      maxWinStreak: JG.integer(0, 10),
      maxLostStreak: JG.integer(50, 100),
    });
  */
  return [
    {
      id: '650b2a03c24da82653689fdd',
      draws: 23,
      avatar: 129,
      number: 175,
      isCaptain: true,
      nickname: 'fugiat',
      wonGames: 14,
      lostGames: 42,
      totalGames: 76,
      maxWinStreak: 4,
      maxLostStreak: 90,
    },
    {
      id: '650b2a03bd06cb524c00d9f1',
      draws: 13,
      avatar: 351,
      number: 297,
      isCaptain: true,
      nickname: 'consectetur',
      wonGames: 41,
      lostGames: 5,
      totalGames: 63,
      maxWinStreak: 3,
      maxLostStreak: 66,
    },
    {
      id: '650b2a03a820d2d453281d82',
      draws: 29,
      avatar: 476,
      number: 267,
      isCaptain: true,
      nickname: 'aute',
      wonGames: 48,
      lostGames: 37,
      totalGames: 83,
      maxWinStreak: 4,
      maxLostStreak: 54,
    },
  ];
}
