$(document).ready(function () {
  var enc_token = document
    .querySelector('meta[name="theme-id-value"]')
    .getAttribute("content");

  let token = sessionStorage.getItem("userToken");
  $("#ChangeMgs").show();

  let filterBtn = $("#filtertblData");

  filterBtn.prop("disabled", true);
  var InShow = $("#showDate");
  var InCon = $("#conPick");
  var fromDt = $("#fromDt");
  var toDt = $("#toDt");
  $(".resetMyVal").hide();

  // $("#conPick,#showDate").change(function() {
  //   if ( (InCon.val() != "")  && (InShow.val() == "today" || InShow.val() == "sevenDay" || InShow.val() == "lstMont")  ) {
  //     filterBtn.prop("disabled", false);
  //     console.log("myval");
  //   }
  // })
  $("#showDate,#fromDt,#toDt").change(function () {
    if (
      (InShow.val() == "today" ||
        InShow.val() == "sevenDay" ||
        InShow.val() == "lstMont") &&
      InShow.val() != null
    ) {
      filterBtn.prop("disabled", false);
    }
    if (
      (InShow.val() == "today" ||
        InShow.val() == "sevenDay" ||
        InShow.val() == "lstMont") &&
      InShow.val() != null

    ) {
      filterBtn.prop("disabled", false);
    }

    if (InShow.val() === "custome") {
      $(".DateDiv").show();
    } else {
      $(".DateDiv").hide();
    }

    if (
      fromDt.val() != "" &&
      toDt.val() != "" &&
      InCon.val() != "" &&
      InCon.val() != null
    ) {
      filterBtn.prop("disabled", false);
      console.log(fromDt.val());
    }
    if (
      fromDt.val() != "" &&
      toDt.val() != "" &&
      $("#conPick").find("option:selected").text() == "All"
    ) {
      filterBtn.prop("disabled", false);
      console.log("dakjsdk");
    }

    if (filterBtn.prop("disabled") == false) {
      $(".resetMyVal").show();
    } else {
      $(".resetMyVal").hide();
    }
  });

  $("#filtertblData").on("click", function () {
    var selectedOption = $("#showDate").val();
    var countrySelect = $("#conPick").val();
    var filterDate;

    if (selectedOption == "today") {
      filterDate =
        moment().format("YYYY-MM-DD") + "," + moment().format("YYYY-MM-DD");
    } else if (selectedOption == "sevenDay") {
      filterDate =
        moment().subtract(7, "days").format("YYYY-MM-DD") +
        "," +
        moment().subtract(0, "days").format("YYYY-MM-DD");
      console.log(filterDate);
    } else if (selectedOption == "lstMont") {
      filterDate =
        moment().subtract(30, "days").format("YYYY-MM-DD") +
        "," +
        moment().subtract(0, "days").format("YYYY-MM-DD");
    } else if (selectedOption == "custome") {
      var dateString1 = $("#fromDt").val();
      var dateString2 = $("#toDt").val();
      filterDate = dateString1 + "," + dateString2;
    }
    $("#table-body").html("");

    $.ajax({
      url: "/livquik/quikwallet/filterbyDate",
      data: {
        startDate: filterDate.split(",")[0],
        endDate: filterDate.split(",")[1],
      },
      headers: { "CSRF-Token": enc_token, Authorization: `bearer ${token}` },
      type: "POST",
      success: function (data) {
        // let tableData;
        data.map((i, index) => {
          let tableData = `
                    <tr>
                    <td>${index + 1}</td>
                    <td>${new Date(i.createdAt).toLocaleDateString()}</td>
                    <td>${i.name}</td>
                    <td>${i.phone}</td>
                    <td>${i.companyName}</td>
                    <td>${i.url}</td>
                    </<tr>
                `;
          $("#table-body").append(tableData);
        });
        $('#table-body tr td').each(function() {
          if($(this).text()==="undefined"){
            $(this).text('')
          }
        });
        dataTablefn();
      },
      error: function (err) {
        if (err.status === 403) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
          setTimeout(function () {
            sessionStorage.clear();
            window.location = "/login";
          }, 1000);
        } else if (err.status === 401) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
          setTimeout(function () {
            sessionStorage.clear();
            window.location = "/401";
          }, 1000);
        } else {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle"></i></span><div class=""> <span class="err">Error</span> <span class="errBlw">${err.responseText}</span> </div><span ><i class="fas fa-times myClose"></i></span>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
        }
      },
    });
  });

  $("#exporttblData").on("click", function () {
    $("#contactTbl").tableToCsv({
      fileName: "contactData",
    });
  });

  $(".resetMyVal").click(function () {
    $(this).hide();
    // $("#showDate").val('default').selectpicker("refresh");
    // $("#conPick").val('default').selectpicker("refresh");
    $("#showDate").val("default");
    $("#showDate").selectpicker("refresh");
    $("#conPick").val("default");
    $("#conPick").selectpicker("refresh");
    $("#fromDt").val("");
    $("#toDt").val("");
    $(".DateDiv").hide();
    $("#filtertblData").prop("disabled", true);
    $("#table-body").empty();

    $.ajax({
      url: "/livquik/quikwallet/getContactData",
      headers: { "CSRF-Token": enc_token, Authorization: `bearer ${token}` },
      type: "POST",
      success: function (data) {
        let tableData;
        data.map((i, index) => {
          tableData = `
                      <tr>
                      <td>${index + 1}</td>
                      <td>${new Date(i.createdAt).toLocaleDateString()}</td>
                      <td>${i.name}</td>
                      <td>${i.phone}</td>
                      <td>${i.companyName}</td>
                      <td>${i.url}</td>
                      </<tr>
              `;
          $("#table-body").append(tableData);
        });
        $('#table-body tr td').each(function() {
          if($(this).text()==="undefined"){
            $(this).text('')
          }
       });
        dataTablefn();
      },
      error: function (error) {
        if (error.status === 403) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
          setTimeout(function () {
            window.location = "/login";
          }, 1000);
        } else if (error.status === 401) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
          setTimeout(function () {
            sessionStorage.clear();
            window.location = "/401";
          }, 1000);
        } else {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
          );
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
        }
      },
    });
  });

  $.ajax({
    url: "/livquik/quikwallet/getContactData",
    headers: { "CSRF-Token": enc_token, Authorization: `bearer ${token}` },
    type: "POST",
    success: function (data) {
      const countryData = [...new Set(data.map((j) => j.country))];
      countryData.map((countrylist) => {
        const country = `<option>${countrylist}</option>`;
        $("#conPick").append(country);
      });
      let tableData;
      data.map((i, index) => {
        tableData = `
                    <tr>
                    <td>${index + 1}</td>
                    <td>${new Date(i.createdAt).toLocaleDateString()}</td>
                    <td>${i.name}</td>
                    <td>${i.phone}</td>
                    <td>${i.companyName}</td>
                    <td>${i.url}</td>
                    </<tr>
                `;
        $("#table-body").append(tableData);
      });
      $('#table-body tr td').each(function() {
        if($(this).text()==="undefined"){
          $(this).text('')
        }
     });
      dataTablefn();
    },
    error: function (error) {
      if (error.status === 403) {
        $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
        $("#logMsg").html(
          `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
        );
        setTimeout(function () {
          $("#logMsg").fadeOut("slow");
        }, 1000);
        setTimeout(function () {
          window.location = "/login";
        }, 1000);
      } else if (error.status === 401) {
        $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
        $("#logMsg").html(
          `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
        );
        setTimeout(function () {
          $("#logMsg").fadeOut("slow");
        }, 1000);
        setTimeout(function () {
          window.location = "/401";
        }, 1000);
      } else {
        $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
        $("#logMsg").html(
          `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
        );
        setTimeout(function () {
          $("#logMsg").fadeOut("slow");
        }, 1000);
      }
    },
  });
});

function dataTablefn() {
  function getPageList(totalPages, page, maxLength) {
    if (maxLength < 5) throw "maxLength must be at least 5";

    function range(start, end) {
      return Array.from(Array(end - start + 1), (_, i) => i + start);
    }

    var sideWidth = maxLength < 9 ? 1 : 2;
    var leftWidth = (maxLength - sideWidth * 2 - 3) >> 1;
    var rightWidth = (maxLength - sideWidth * 2 - 2) >> 1;
    if (totalPages <= maxLength) {
      return range(1, totalPages);
    }
    if (page <= maxLength - sideWidth - 1 - rightWidth) {
      return range(1, maxLength - sideWidth - 1)
        .concat([0])
        .concat(range(totalPages - sideWidth + 1, totalPages));
    }
    if (page >= totalPages - sideWidth - 1 - rightWidth) {
      return range(1, sideWidth)
        .concat([0])
        .concat(
          range(totalPages - sideWidth - 1 - rightWidth - leftWidth, totalPages)
        );
    }
    return range(1, sideWidth)
      .concat([0])
      .concat(range(page - leftWidth, page + rightWidth))
      .concat([0])
      .concat(range(totalPages - sideWidth + 1, totalPages));
  }

  $(function () {
    var numberOfItems = $("#contactTbl tbody tr").length;
    var limitPerPage = 10;
    var totalPages = Math.ceil(numberOfItems / limitPerPage);
    var paginationSize = 5;
    var currentPage;
    var totalRows = $("#contactTbl tbody tr").length;
    if ($(".noMatch").text() == "No Data Found") {
      $(".rows_count,.dropSelect").hide();
    } else {
      $(".rows_count,.dropSelect").show();
    }
    if (totalRows == 0) {
      $("#contactTbl tbody").append(
        "<tr class='removeRow'><td colspan='9' class='noMatch'>No Data Found</td></tr>"
      );
    }

    if (totalRows <= 10) {
      $(".pagination").hide();
      $(".rows_count,.dropSelect").hide();
    } else {
      $(".pagination").show();
      $(".rows_count,.dropSelect").show();
    }

    function showPage(whichPage) {
      if (whichPage < 1 || whichPage > totalPages) return false;
      currentPage = whichPage;
      var maxRows = 10;
      var totalTr = $("#contactTbl tbody tr").length;
      var status = (currentPage - 1) * maxRows + 1;
      var stat =
        totalTr < currentPage * maxRows || maxRows == 0
          ? totalTr
          : currentPage * maxRows;
      var myString =
        "Showing " + status + " to " + stat + " of " + totalTr + " entries";

      $(".rows_count").html(myString);
      $("#contactTbl tbody tr")
        .hide()
        .slice((currentPage - 1) * limitPerPage, currentPage * limitPerPage)
        .show();
      $(".pagination li").slice(1, -1).remove();
      getPageList(totalPages, currentPage, paginationSize).forEach((item) => {
        $("<li>")
          .addClass(
            "page-item " +
              (item ? "current-page " : "") +
              (item === currentPage ? "active " : "")
          )
          .append(
            $("<a>")
              .addClass("page-link")
              .attr({
                href: "javascript:void(0)",
              })
              .text(item || "...")
          )
          .insertBefore("#next-page");
      });
      return true;
    }

    $(".pagination").append(
      $("<li>")
        .addClass("page-item")
        .attr({ id: "previous-page" })
        .append(
          $("<a>")
            .addClass("page-link")
            .attr({
              href: "javascript:void(0)",
            })
            .text("Prev")
        ),
      $("<li>")
        .addClass("page-item")
        .attr({ id: "next-page" })
        .append(
          $("<a>")
            .addClass("page-link")
            .attr({
              href: "javascript:void(0)",
            })
            .text("Next")
        )
    );

    $("#contactTbl tbody tr").show();
    showPage(1);

    $(document).on(
      "click",
      ".pagination li.current-page:not(.active)",
      function () {
        return showPage(+$(this).text());
      }
    );
    $("#next-page").on("click", function () {
      return showPage(currentPage + 1);
    });

    $("#previous-page").on("click", function () {
      return showPage(currentPage - 1);
    });
    $(".pagination").on("click", function () {
      $("html,body").animate({ scrollTop: 0 }, 0);
    });
  });
}

setTimeout(() => {
  $("select").selectpicker("refresh");
}, 800);
