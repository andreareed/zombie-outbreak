const queueHandler = (function() {
  const queue = {};

  return {
    queue,
    increaseZombieQueue: (avgTimeForHumanToTurnIntoZombie, incoming) => {
      const timeInMinutes = avgTimeForHumanToTurnIntoZombie * 60;
      queue[timeInMinutes] = queue.hasOwnProperty(timeInMinutes) ? queue[timeInMinutes] + incoming : incoming;
    },
    processQueue: timeInHours => {
      const timeInMinutes = timeInHours * 60;
      const newQueue = {};
      let zombies = 0;
      for (let time in queue) {
        if (parseInt(time, 10) - timeInMinutes <= 0) {
          zombies = queue[time];
        } else {
          newQueue[parseInt(time, 10) - timeInMinutes] = queue[time];
        }
        delete queue[time];
      }

      for (let key in newQueue) {
        queue[key] = newQueue[key];
      }
      return zombies;
    },
  };
})();

const encounterOutcomes = (humans, zombies, zombieInfectsHumanRatio, humanKillsZombieRatio) => {
  const outcomes = {
    humansInfected: 0,
    zombiesKilled: 0,
  };

  // Smaller humans/zombie populations run manually
  if (humans <= 100 || zombies < 10) {
    for (let i = 0; i < zombies && humans > 0; i++) {
      const random = Math.random();
      if (random < zombieInfectsHumanRatio) {
        humans--;
        outcomes.humansInfected++;
      } else if (random >= zombieInfectsHumanRatio && random < humanKillsZombieRatio + zombieInfectsHumanRatio) {
        zombies--;
        outcomes.zombiesKilled++;
      }
    }
  } else {
    outcomes.zombiesKilled = Math.floor(zombies * humanKillsZombieRatio);
    outcomes.humansInfected = Math.floor(zombies * zombieInfectsHumanRatio);

    if (outcomes.zombiesKilled > zombies) {
      outcomes.zombiesKilled = zombies;
    }
    if (outcomes.humansInfected > humans) {
      outcomes.humansInfected = humans;
    }
  }
  return outcomes;
};

const zombieOutbreak = (
  humans,
  zombies,
  avgTimeForZombieToCompleteAttack,
  avgTimeForHumanToTurnIntoZombie,
  zombieInfectsHumanRatio,
  humanKillsZombieRatio,
  timeFromStart = 0
) => {
  // Base case - Simulation is over when all humans or all zombies have been eradicated
  if (!humans || (!zombies && Object.keys(queueHandler.queue).length === 0)) {
    return `Zombies took over the world in ${timeFromStart} hours!`;
  }

  // Use the shortest possible time between zombie attacks or humans turning into zombies
  const shortestTimeBetweenEvents =
    avgTimeForZombieToCompleteAttack < avgTimeForHumanToTurnIntoZombie
      ? avgTimeForZombieToCompleteAttack
      : avgTimeForHumanToTurnIntoZombie;

  // Get the results of zombie encounters for this period
  const { humansInfected, zombiesKilled } = encounterOutcomes(
    humans,
    zombies,
    zombieInfectsHumanRatio,
    humanKillsZombieRatio
  );

  //Update human/zombie totals, the zombie queue, and the time passed
  humans -= humansInfected;
  zombies -= zombiesKilled;
  queueHandler.increaseZombieQueue(avgTimeForHumanToTurnIntoZombie, humansInfected);
  zombies += queueHandler.processQueue(shortestTimeBetweenEvents);
  timeFromStart += shortestTimeBetweenEvents;

  //Recursively run the simulation until base case is acheived
  return zombieOutbreak(
    humans,
    zombies,
    avgTimeForZombieToCompleteAttack,
    avgTimeForHumanToTurnIntoZombie,
    zombieInfectsHumanRatio,
    humanKillsZombieRatio,
    timeFromStart
  );
};

console.log(zombieOutbreak(7000000000, 1, 1, 4, 0.9, 0.03));
