"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

//  BORROWED 'showDeleteBtn = false' logic from solution.
// I would have never figured this out on my own!
function generateStoryMarkup(story, showDeleteBtn = false) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();

  return $(`
      <li id="${story.storyId}">
      ${showDeleteBtn ? '<i class="fas fa-trash-alt"></i>' : ""}
      <i class="far fa-star hidden"></i>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();

  $allFavoritesList.hide();
  $allMyStoriesList.hide();
}

function putFavoritesOnPage() {
  console.debug("putFavoritesOnPage");

  // $favoritesContainer.show();
  $allFavoritesList.empty();

  // loop through all of our Favorites and generate HTML for them
  for (let story of currentUser.favorites) {
    const $story = generateStoryMarkup(story);
    $allFavoritesList.append($story);
  }

  if (currentUser.favorites.length === 0) {
    $allFavoritesList.text("No favorites added!");
    $allFavoritesList.removeClass('hidden');
  }

  $allFavoritesList.show();
}

function putMyStoriesOnPage() {
  console.debug("putMyStoriesOnPage");

  $allMyStoriesList.empty();

  // loop through all of our MyStories and generate HTML for them
  for (let story of currentUser.ownStories) {
    const $story = generateStoryMarkup(story, true);
    $story.on("click", removeStory);
    $allMyStoriesList.append($story);
  }

  if (currentUser.ownStories.length === 0) {
    $allMyStoriesList.text("No stories added by user yet!");
    $allMyStoriesList.removeClass('hidden')
  }

  $allMyStoriesList.show();
}

async function getFormDataAndAddStory(evt) {
  console.debug("getFormDataAndAddStory", evt);
  evt.preventDefault();

  const title = $("#story-title").val();
  const author = $("#story-author").val();
  const url = $("#story-url").val();

  let newStory = {
    title: title,
    author: author,
    url: url
  };

  let addedStory = await storyList.addStory(currentUser, newStory);
  await getAndShowStoriesOnStart();
  hidePageComponents();
  $("#story-title").val("");
  $("#story-author").val("");
  $("#story-url").val("");

  // if we got a logged-in user
  if (currentUser) {
    updateUIOnUserLogin();
    currentUser.ownStories.push(addedStory);
  }
}

$storyForm.on("submit", getFormDataAndAddStory);

async function removeStory(storyId) {
  console.debug("removeStory");

  let deleteStory = await storyList.deleteStory(currentUser, storyId.currentTarget.id);

  // remove from storyList.stories array
  for (let i = 0; i < storyList.stories.length; i++) {
    if (storyList.stories[i].storyId === deleteStory.data.story.storyId) {
      storyList.stories.splice(i, 1);
    }
  }

  // remove from favorites array
  for (let i = 0; i < currentUser.favorites.length; i++) {
    if (currentUser.favorites[i].storyId === deleteStory.data.story.storyId) {
      currentUser.favorites.splice(i, 1);
    }
  }

  // remove from my stories array
  for (let i = 0; i < currentUser.ownStories.length; i++) {
    if (currentUser.ownStories[i].storyId === deleteStory.data.story.storyId) {
      currentUser.ownStories.splice(i, 1);
    }
  }
  putMyStoriesOnPage();
}

async function evaluateFavorites(id) {
  let className = $(`#${id} > i`).get(0).className;
  let favorite = 'fas fa-star';
  let unfavorite = 'far fa-star';

  // toggle favorite on/off
  $(`#${id} > i`).toggleClass(favorite).toggleClass(unfavorite);

  // if story id being marked as favorite, push it to array
  // if story id being unmarked as favorite, splice it out of the array
  for (let story of storyList.stories) {
    if (story.storyId === id) {
      if (className === unfavorite) {
        currentUser.favorites.push(story);
        await User.addOrDeleteFavorite(currentUser, id, "post");
      }
      if (className === favorite) {
        for (let i = 0; i < currentUser.favorites.length; i++) {
          if (currentUser.favorites[i].storyId === id) {
            currentUser.favorites.splice(i, 1);
            await User.addOrDeleteFavorite(currentUser, id, "delete");
          }
        }
      }
    }
  }
}