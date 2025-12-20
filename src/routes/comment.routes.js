const express=require("express");
const router=express.Router();

const auth=require("../middlewares/auth.middleware")
const{
    addComment,
    getComment,
}=require("../controllers/comment.controller");

router.post("/add",auth,addComment);
router.get("/:postType/:postId",getComments);

module.exports=router;