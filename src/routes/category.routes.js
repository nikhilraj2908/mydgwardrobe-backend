const express=require("express")
const router=express.Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/uploadCategory.middleware");
const controller = require("../controllers/category.controller");

const {getAllCategories,
    createCategory,
    deleteCategory,
    getUserCategories
}=require("../controllers/category.controller");

router.get("/",getAllCategories);
router.get("/user", auth, getUserCategories);
router.post("/",auth,createCategory);

router.post(
  "/:id/images",
  auth,
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  controller.uploadCategoryImages
);

router.delete("/:id",auth,deleteCategory);


module.exports=router;