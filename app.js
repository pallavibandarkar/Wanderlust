if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}
const express = require("express");
const app = express();
const mongoose= require("mongoose");
const path = require("path");
const methodOverride=require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const listingRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/reviews.js");
const userRouter = require("./routes/user.js");


const dbUrl = process.env.ATLAS_DBURL;

main().then(()=>{
    console.log("Connected to Atlas db successfully!!!");
})
.catch(()=>{
    console.log("oops!Something went wrong!!!");
})

async function main(){
    await mongoose.connect(dbUrl);
}


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


const sessionOptions = {
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie:{
        expires:Date.now + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    }
}
// app.get("/",(req,res)=>{
//     res.send("Root route is working!!!");
//     console.log("root route is working");
// })

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser = req.user;
    //console.log(res.locals.success);
    next();
})

// app.get("/demouser", async (req,res)=>{
//     let fakeUser = new User ({
//         email:"student@gmail.com",
//         username:"pallaviB"
//     });
//     let registered = await User.register(fakeUser,"helloworld");
//     console.log(registered);
//     res.send(registered);
// });


app.use("/listings",listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/",userRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page not found!!"))
})
app.use((err,req,res,next)=>{
    let {statusCode=404,message="Page not found!!"}=err;
    //console.log(statusCode);
    console.log(err.message);
    console.log(err)
    res.status(statusCode).render("error.ejs",{message});
})

app.listen(8080,()=>{
    console.log("app is listening on port 8080!!");
})