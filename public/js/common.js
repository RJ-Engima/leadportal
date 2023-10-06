$(document).ready(function () {
  var fromUser = localStorage.getItem("loginName");
  var dataFromUser = JSON.parse(sessionStorage.getItem("loginData"));
  if (dataFromUser) {
    document.getElementById("profileName").innerHTML = dataFromUser.userName;
  } else {
    return;
  }

  var enc_token = document.querySelector('meta[name="theme-id-value"]').getAttribute("content");

  $("#changePassword").on("submit", function (e) {
    e.preventDefault();

    var c_pass = $("#currentPass").val();
    var new_pass = $("#newChangePass").val();
    var conf_pass = $("#confChangePass").val();
    var userName = JSON.parse(sessionStorage.getItem("loginData")).userName;
    if (c_pass != "" && new_pass != "" && conf_pass != "") {
      $.ajax({
        url: "/changePassword",
        data: {
          currentpassword: c_pass,
          newPassword: new_pass,
          userName: userName,
        },
        headers: { "CSRF-Token": enc_token },
        type: "POST",
        success: function (data) {
          $("#logMsg").removeClass("hide").addClass("successAlert").show();
          $("#logMsg").html(`<span><i class="far fa-check-circle siIcon"></i></span><div> <h2 class="err">Success</h2> <p class="errBlw">Password Changed Successfully</p> </div>`);
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
            $(".passChangemod").modal("hide");
            $("#currentPass").val("");
            $("#newChangePass").val("");
            $("#confChangePass").val("");
          }, 2000);

          alert("pssword changed successfully");
        },
        error: function (err) {
          console.log(err, "error");
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(`<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`);

          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 2000);
        },
      });
    }

    $(".errIn").each(function () {
      if ($(this).val() == "") {
        $(this).parents(".passChangeIn").find(".reqMsg").show();
      }
      $(this).keypress(function () {
        $(this).parents(".passChangeIn").find(".reqMsg").hide();
      });
    });

    if (new_pass != conf_pass) {
      $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
      $("#logMsg").html(`<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">New password and confirm password must be same</p> </div>`);
      setTimeout(function () {
        $("#logMsg").fadeOut("slow");
      }, 2000);
    }
  });

  $(".clsBtn").click(function () {
    $("#currentPass").val("");
    $("#newChangePass").val("");
    $("#confChangePass").val("");
  });
  $(".lout").on("click", function () {
    window.location.href='/logout';
    sessionStorage.clear();
  });
});
