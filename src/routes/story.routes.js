const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const { getStoryViewers } = require("../controllers/story.controller");
const {
  createStory,
  getActiveStories,
  deleteStory,
  markStoryViewed,
} = require("../controllers/story.controller");


/* Create Story */
// router.post(
//   "/",
//   auth,
//   upload.single("media"),
//   createStory
// );

router.post(
  "/",
  auth,
  upload.single("media"),
  createStory
);


/* Get Active Stories */
router.get("/", auth, getActiveStories);
router.get("/:id/viewers", auth, getStoryViewers);
/* Delete Story */
router.delete("/:id", auth, deleteStory);

router.post("/:id/view", auth, markStoryViewed);


module.exports = router;
