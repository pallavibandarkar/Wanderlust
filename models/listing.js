const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },

    image:[
        {
        url:String,
        filename:String,
        }
    ],
    price:{
        type:Number
    },
    location:{
        type:String
    },
    country:{
        type:String
    },
    reviews:[
        {
        type:Schema.Types.ObjectId,
        ref:"Review",
        },
    ],
    owner:{
        type : Schema.Types.ObjectId,
        ref : "User",
    },
    geometry: {
        type: {
          type: String, // Don't do `{ location: { type: String } }`
          enum: ['Point'], // 'location.type' must be 'Point'
          required: true
        },
        coordinates: {
          type: [Number],
          required: true
        }
      },
    category:{
        type:String,
        enum:["Trending","Rooms","Iconic Cities","Mountain","Lake","Camping","Castles","Amazing pool","farms","Domes","Boats",

       ,"Beach"],
       required : true
    },
    place:{
        type:String,
        enum:["An Entire Place","Rooms","Shared Room"],
    },
    guests:{
        type:Number
    },
    bedrooms:{
        type:Number
    },
    beds:{
        type:Number
    },
    bathrooms:{
        type:Number
    },
    
})

listingSchema.post("findOneAndDelete", async(listing)=>{
    if(listing){
        await Review.deleteMany({_id : {$in:listing.reviews}});
    }
});



const Listing= mongoose.model("Listing",listingSchema);
module.exports=Listing;