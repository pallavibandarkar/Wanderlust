const Listing=require("../models/listing.js");
const Booking=require("../models/booking.js")
const axios = require('axios');
const Review = require("../models/review.js");
const cloudinary = require('cloudinary').v2;
const User = require('../models/user')


module.exports.index=async (req,res)=>{
    const allListings=await Listing.find({});

    let wishList = [];

    if (req.isAuthenticated()) {
        const userData = await User.findById(req.user._id);
        if (userData) {
            wishList = userData.wishList.map(listing => listing.toString());
        }
    }
    res.render("listings/index.ejs",{ allListings ,wishList });
}

module.exports.renderNewForm = (req,res)=>{
    res.render("listings/new.ejs");
}

module.exports.showListings = async (req,res)=>{

    let {id}=req.params;
    const listing =await Listing.findById(id)
    .populate({path:"reviews",
    populate:
    {path:"author"},
    }).
    populate("owner","username");

    
    if(!listing){
        req.flash("error","Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs",{listing});
}

module.exports.createListing = async (req,res,next)=>{
    if (!req.files || req.files.length === 0) {
        req.flash('error', 'At least one image is required.');
        return res.redirect('/listings/new'); 
    }
    
    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
        params: {
          q: req.body.listing.location, 
          key: process.env.OPENCAGE_API_KEY, 
          language: 'en', 
          limit: 1 
        }
    });

    if(response.data.results.length === 0) {
        req.flash("error", "Location not found!");
        return res.redirect("/listings");
    }
  
    const resultGeometry = response.data.results[0].geometry;
    const geometry = {
        type: "Point",
        coordinates: [resultGeometry.lng, resultGeometry.lat] //[longitude, latitude]
    };

    const newlisting = new Listing(req.body.listing);
    newlisting.owner = req.user._id;
    newlisting.geometry =geometry
    if (req.files && req.files.length > 0) {
        const imageData = req.files.map(file => ({
            url: file.path,
            filename: file.filename,
        }));
        newlisting.image = imageData;
    }
    
    
    let savedlisting = await newlisting.save();
    
    req.flash("success","New listing created!!");
    res.redirect("/listings");
    
}

module.exports.renderEditForm = async(req,res)=>{
    let {id}=req.params;
    const listing =await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    
    res.render("listings/edit.ejs",{listing});
}

module.exports.updateRoute = async (req,res,next)=>{
    let {id}=req.params;
    let listing = await Listing.findById(id);

    if(req.body.listing.location){
        const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
            params: {
              q: req.body.listing.location,  
              key: process.env.OPENCAGE_API_KEY,
              language: 'en',
              limit: 1
            }
        });
    
        if(response.data.results.length === 0) {
            req.flash("error", "Location not found!");
            return res.redirect("/listings");
        }
      
        const resultGeometry = response.data.results[0].geometry;
        const geometry = {
            type: "Point",
            coordinates: [resultGeometry.lng, resultGeometry.lat]  //[longitude, latitude]
        };
    
        listing.geometry = geometry
        const data = await listing.save()
    }

    if (req.files && req.files.length > 0) {        
        const imageData = req.files.map(file => ({
            url: file.path,
            filename: file.filename,
        }));
        listing.image = imageData;
        await listing.save()
    }
    

    if(!listing.owner.equals(res.locals.currUser._id)){
        req.flash("error","You don't have permission to edit");
        return res.redirect(`/listings/${id}`);
    }
    await Listing.findByIdAndUpdate(id,{...req.body.listing});
    req.flash("success","listing updated!!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyRoute = async (req,res)=>{
    let {id} = req.params;
    let listing = await Listing.findById(id)

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (listing.image && listing.image.length > 0) {
        const imagestobeDelete = listing.image.map(img => ({
            public_id: img.filename,
        }));

        for (const image of imagestobeDelete) {
            await cloudinary.uploader.destroy(image.public_id);
        }
    }
    const deletedListing=await Listing.findByIdAndDelete(id);
    req.flash("success","listing Deleted!!");
    res.redirect("/listings");
}
 
module.exports.search = async(req,res)=>{
    const {location} = req.body;

    let wishList = [];

    if (req.isAuthenticated()) {
        const userData = await User.findById(req.user._id);
        if (userData) {
            wishList = userData.wishList.map(listing => listing.toString());
        }
    }
    const allListings = await Listing.find({location:location})
    if(allListings.length === 0){
        return res.render("error.ejs",{message:"No Search Found"})
    }
    req.flash("success","Search location listing found")
    res.render("listings/index.ejs",{allListings,wishList})
}

module.exports.categoryListing = async(req,res)=>{
    let {category} = req.params;
    let listings = await Listing.find({category : category});

    let wishList = [];

    if (req.isAuthenticated()) {
        const userData = await User.findById(req.user._id);
        if (userData) {
            wishList = userData.wishList.map(listing => listing.toString());
        }
    }
    res.render("listings/category.ejs",{listings,wishList});
}

module.exports.reservations=async(req,res)=>{
    const ownerListings = await Listing.find({ owner: req.params.id });
    const listingIds = ownerListings.map(listing => listing._id);

    const allBookings = await Booking.find({ listing: { $in: listingIds } }).populate('user').populate('listing');

    if(allBookings.length === 0){
        return res.render("error.ejs",{message:"No Reservation requests found!"})
    }
    const reservations = listingIds.map(id => {
        const bookings = allBookings.filter(booking => booking.listing.equals(id));
        return bookings.length > 0 ? { listingId: id, bookings } : null;
    }).filter(reservation => reservation !== null);

    res.render("users/reservation.ejs",{reservations})
   
}