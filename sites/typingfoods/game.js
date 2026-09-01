(function () {
  var questions = [
    { food: "PIZZA", right: ["Cheese", "Pepperoni"], wrong: ["Cereal", "Syrup", "Yogurt", "Watermelon"] },
    { food: "HAMBURGER", right: ["Beef", "Bun"], wrong: ["Marshmallow", "Pancake", "Rice", "Grapes"] },
    { food: "TACO", right: ["Tortilla", "Lettuce"], wrong: ["Chocolate", "Blueberries", "Oatmeal", "Jelly"] },
    { food: "PANCAKES", right: ["Flour", "Eggs"], wrong: ["Pickles", "Tuna", "Onions", "Broccoli"] },
    { food: "SPAGHETTI", right: ["Noodles", "Tomato Sauce"], wrong: ["Waffles", "Popcorn", "Peaches", "Coconut"] },
    { food: "GRILLED CHEESE", right: ["Bread", "Cheese"], wrong: ["Banana", "Chicken", "Beans", "Carrots"] },
    { food: "HOT DOG", right: ["Sausage", "Bun"], wrong: ["Ice Cream", "Apples", "Cornflakes", "Pasta Sauce"] },
    { food: "BURRITO", right: ["Rice", "Beans"], wrong: ["Cookies", "Strawberries", "Butter", "Cupcake"] },
    { food: "SALAD", right: ["Lettuce", "Tomato"], wrong: ["Candy", "Pudding", "Bacon Bits Cereal", "Pancakes"] },
    { food: "OMELET", right: ["Eggs", "Cheese"], wrong: ["Pretzels", "Pineapple Juice", "Crackers", "Jam"] },
    { food: "PEANUT BUTTER SANDWICH", right: ["Bread", "Peanut Butter"], wrong: ["Potatoes", "Salsa", "Noodles", "Lemon"] },
    { food: "ICE CREAM SUNDAE", right: ["Ice Cream", "Chocolate Syrup"], wrong: ["Mustard", "Lettuce", "Rice", "Tortilla"] },
    { food: "CHICKEN SOUP", right: ["Chicken", "Broth"], wrong: ["Frosting", "Gum", "Watermelon", "Pancake Mix"] },
    { food: "FRENCH FRIES", right: ["Potatoes", "Salt"], wrong: ["Yogurt", "Grapes", "Cereal", "Eggs"] },
    { food: "CHOCOLATE CAKE", right: ["Flour", "Chocolate"], wrong: ["Pickles", "Taco Shell", "Celery", "Ketchup"] }
  ];

  var score = 0;
  var correct = 0;
  var timeLeft = 15;
  var timer = null;
  var currentRight = "";
  var running = false;
  var previousQuestion = -1;

  function byId(id) {
    return document.getElementById(id);
  }

  function randomNumber(maximum) {
    return Math.floor(Math.random() * maximum);
  }

  function shuffle(items) {
    var i;
    for (i = items.length - 1; i > 0; i--) {
      var j = randomNumber(i + 1);
      var temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }
    return items;
  }

  function setButtonsEnabled(enabled) {
    var i;
    for (i = 0; i < 4; i++) {
      byId("answer" + i).disabled = !enabled;
    }
  }

  function updateStats() {
    byId("score").innerHTML = score;
    byId("correct").innerHTML = correct;
    byId("time").innerHTML = timeLeft;
  }

  function stopTimer() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function finishGame() {
    running = false;
    stopTimer();
    setButtonsEnabled(false);
    byId("food").innerHTML = "YOU WIN!";
    byId("message").innerHTML = "You got 10 correct answers! Final score: " + score;
    byId("startButton").innerHTML = "Play Again";
    byId("startButton").style.display = "inline";
  }

  function chooseQuestion() {
    var index = randomNumber(questions.length);
    if (questions.length > 1) {
      while (index === previousQuestion) {
        index = randomNumber(questions.length);
      }
    }
    previousQuestion = index;
    return questions[index];
  }

  function nextQuestion(message) {
    if (!running) {
      return;
    }
    if (correct >= 10) {
      finishGame();
      return;
    }

    stopTimer();
    var question = chooseQuestion();
    var rightAnswer = question.right[randomNumber(question.right.length)];
    var wrongAnswers = shuffle(question.wrong.slice(0));
    var answers = [rightAnswer, wrongAnswers[0], wrongAnswers[1], wrongAnswers[2]];
    shuffle(answers);

    currentRight = rightAnswer;
    timeLeft = 15;
    byId("food").innerHTML = question.food;
    byId("message").innerHTML = message || "Choose the ingredient!";

    var i;
    for (i = 0; i < 4; i++) {
      byId("answer" + i).innerHTML = answers[i];
      byId("answer" + i).value = answers[i];
    }

    setButtonsEnabled(true);
    updateStats();

    timer = window.setInterval(function () {
      timeLeft--;
      updateStats();
      if (timeLeft <= 0) {
        stopTimer();
        setButtonsEnabled(false);
        window.setTimeout(function () {
          nextQuestion("Time ran out. Here is the next food!");
        }, 700);
      }
    }, 1000);
  }

  function answerQuestion(answer) {
    if (!running) {
      return;
    }

    stopTimer();
    setButtonsEnabled(false);

    if (answer === currentRight) {
      score++;
      correct++;
      updateStats();
      if (correct >= 10) {
        window.setTimeout(finishGame, 500);
      } else {
        window.setTimeout(function () {
          nextQuestion("Correct! You earned 1 point.");
        }, 500);
      }
    } else {
      score--;
      updateStats();
      window.setTimeout(function () {
        nextQuestion("Wrong! You lost 1 point.");
      }, 500);
    }
  }

  function startGame() {
    stopTimer();
    score = 0;
    correct = 0;
    timeLeft = 15;
    previousQuestion = -1;
    running = true;
    byId("startButton").style.display = "none";
    updateStats();
    nextQuestion("Choose the ingredient!");
  }

  byId("startButton").onclick = startGame;
  byId("answer0").onclick = function () { answerQuestion(this.value); };
  byId("answer1").onclick = function () { answerQuestion(this.value); };
  byId("answer2").onclick = function () { answerQuestion(this.value); };
  byId("answer3").onclick = function () { answerQuestion(this.value); };
}());