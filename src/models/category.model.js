const mongoose=require("mongoose")
const categorySchema =new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    type:{
        type:String,
        enum:["mens","womens","unisex"],
        require:true

    },
    icon:{type:String},
    isActive:{type:Boolean,default:true},
},{timestamps:true});

module.exports=mongoose.model("Category",categorySchema);