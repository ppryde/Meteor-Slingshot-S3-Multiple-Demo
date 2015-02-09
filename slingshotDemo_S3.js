if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('uploadProgress', 0);
  Session.setDefault('upload_images', []);

  Template.myPictures.helpers({
    upload_images: function(){
        return Session.get('upload_images');
    }
  });

  Template.progressBar.helpers({
    progress: function () {
      return Session.get('uploadProgress');
    }
  });


  Template.uploaderTemplate.events({
    'change #upload-btn': function (event, template) {

      //Session var for holding overall progress
      Session.set('uploadProgress', 0);
      //Session var for holding objects containing url and progress
      //for each image we upload
      Session.set('upload_images', []);

      //Check that there is a file or more to be processed
      if (event.target.files.length>0){

        //set a couple of variables
        var files = event.target.files;
        var total_files = files.length;

        var uploads = _.map(files, function (file) {
            var uploader = new Slingshot.Upload("aws-s3-example");
            uploader.send(file, function (error, downloadUrl) {
                //Meteor.users.update(Meteor.userId(), {$push: {"profile.files": downloadUrl}});
                //Do some stuff, upload a reference to Mongodb collection etc
                console.log('uploaded file available here: '+downloadUrl);
            });
            return uploader;
        });

        //Create a tracker to iterate our array of uploaders and
        //return information to store in our Session variable
        var uploadTracker = Tracker.autorun(function (computation) {

            //Rest our variables here
            var image_array = [];
            var overall_progress = 0;

            //iterate with underscore over our uploaders and push details to array
            _.each(uploads, function(a_uploader){
                var prog = a_uploader.progress();
                if (!isNaN(prog))
                    prog = Math.round(prog*100);
                else
                    prog=0;
                console.log(prog);
                var image_details = {
                    url: a_uploader.url(true),
                    progress: prog
                };
                image_array.push(image_details);
                //Update the overall progress
                overall_progress = overall_progress+prog;
                console.log(overall_progress );
            });

            overall_progress = overall_progress/total_files;

            //Set our Session var array of image details
            Session.set('upload_images', image_array);

            if (!isNaN(overall_progress)){
              Session.set('uploadProgress', Math.round(overall_progress));
            }
            if(overall_progress==100){
                computation.stop();
            }
            return;
        });

      }//end if
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Slingshot.createDirective("aws-s3-example", Slingshot.S3Storage, {
      bucket: "MYBUCKET",

      acl: "public-read",
      AWSAccessKeyId: "MYKEY",
      AWSSecretAccessKey: "MYSECRETKEY",
      region: "eu-west-1",
      authorize: function () {
        //Deny uploads if user is not logged in.
        //if (!this.userId) {
          //var message = "Please login before posting files";
          //throw new Meteor.Error("Login Required", message);
        //}

        return true;
      },
      maxSize: 10 * 1024 * 1024,
      allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],
      key: function (file) {
        return 'uploadDir' + "/" + file.name;
      }
    });
  });
}


