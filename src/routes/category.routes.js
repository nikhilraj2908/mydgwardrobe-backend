const express=require("express")
const router=express.Router();
const auth = require("../middlewares/auth.middleware");

const {getAllCategories,
    createCategory,
    deleteCategory
}=require("../controllers/category.controller");

router.get("/",getAllCategories);
router.post("/",auth,createCategory);
router.delete("/:id",auth,deleteCategory);


module.exports=router;