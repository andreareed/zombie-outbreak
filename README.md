# Zombie Outbreak

The goal of Zombie Outbreak is to make a simple model of how quickly a zombie virus might spread through a given area.

## Assumptions

There are obviously a lot of factors that would go into a real zombie apolcolypse scenario. For this calculation, we'll ignore factors like population density, zombie starvation, non-zombie caused deaths, births, climate challenges, hard-core survivors, etc. There are some things we will account for though:

- **A zombie attack will take a certain amount of time.** Zombies have to chase, takedown, and at least get a few bites in. Their goal is of course to eat the humans, so that will take some time as well. Since this would inevitably vary greatly, we'll use an average time for each zombie attack. The average will be entered in hours, but can a be decimal such as .25 for a 15 minute average.

- **Each zombie encounter will have 1 of 3 outcomes.** An encounter with a zombie will end in one of these ways:
  - Zombie kills human, creating another zombie.
  - Human kills zombie
  - Human escapes, uninfected


* **Humans do not immediately turn into zombies after infection** It takes some amount of time for the infection to take hold after the encounter. This number will be in hours, but like the attack time, can be a decimal.

## Calculating Zombie Outcomes

I first started by trying to just do some basic math. If there's a 90% chance that zombie will infect a human, that means that `zombies x .9` should be the amount of _new_ zombies, right? Except that ends up with weird fractional humans and whatnot. Sure, it _should_ work out in the end, but that still seemed too messy. Another option was to run a scenario with weighted outcomes for each encounter. This works really well with smaller numbers, but if you're working with numbers in the billions, that's a lot of extra processing power.

Smaller numbers would be skewed by the math-only calculations necessary for large numbers, and large numbers would take too long to calculate. I ultimately settled on the best of both worlds. For human populations under 100 or zombie populations over 10, the encounters are run manually. Anything higher crunches the numbers with the math-only approach.

```
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
```

No more fractional people or zombies, and no worries about stack overflow!

## The Zombification Delay

Since one of my assumptions was that humans don't immediately become zombies, I needed to account for that delay while doing the calculations. I needed a zombie _queue_. It made sense to break queue operations out into their own function, but I didn't want to keep passing the queue around. This had `closure` written all over it.

I created a `queueHandler` to store the queue, along with private methods to manipulate it.

```
let queue = {};

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
```

## Recursively taking over the world

Obviously this simulation would require running encounters repeatedly, and had a perfect base case - either humans, or zombies, would be eradicated. It was the perfect candidate for recursion.

```
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

  //Recursively run the simulation until base case is achieved
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
```

## The final solution

With a population of 7 billion (and ignoring a bunch of other stuff because this is just for funsies), it turns out it usually only takes about 75 hours for zombies to take over the world. The more you know!

```
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

  //Recursively run the simulation until base case is achieved
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

zombieOutbreak(7000000000, 1, 1, 4, 0.9, 0.03);
```
