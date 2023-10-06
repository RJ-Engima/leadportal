$(document).ready(function () {
  var enc_token = document
    .querySelector('meta[name="theme-id-value"]')
    .getAttribute("content");

  let token = sessionStorage.getItem("userToken");

  $.ajax({
    url: "/getLandingPageData",
    headers: { "CSRF-Token": enc_token, Authorization: `bearer ${token}` },
    type: "POST",
    success: function (data) {
      const pageNamelist = [...new Set(data.map((j) => j.pagename))];
      pageNamelist.map((pagelist) => {
        const pagename = `<option>${pagelist}</option>`;
        $("#subsPick").append(pagename);
      });
      let tableData;
      data.map((i, index) => {
        tableData = `
                    <tr>
                    <td>${index + 1}</td>
                    <td>${new Date(i.createdAt).toLocaleDateString()}</td>
                    <td>${i.name}</td>
                    <td>${i.email}</td>
                    <td>${i.country}</td>
                    <td>${i.company}</td>
                    <td>${i.pagename}</td>
                    <td>${i.url}</td>
                    </<tr>
                `;
        $("#table-body-landingpage").append(tableData);
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
          window.location = "/login";
        }, 1000);
        setTimeout(function () {
          $("#logMsg").fadeOut("slow");
        }, 1000);
      } else if (error.status === 401) {
        $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
        $("#logMsg").html(
          `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${error.statusText}</p> </div>`
        );
        setTimeout(function () {
          window.location = "/401";
        }, 1000);
        setTimeout(function () {
          $("#logMsg").fadeOut("slow");
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

  $("#filtertblData").on("click", function () {
    var pageSelect = $("#subsPick").val();
    $("#table-body-landingpage").html("");
    $.ajax({
      url: "/landingpageFilterbyPage",
      data: {
        pagename: pageSelect,
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
                    <td>${i.email}</td>
                    <td>${i.country}</td>
                    <td>${i.company}</td>
                    <td>${i.pagename}</td>
                    <td>${i.url}</td>
                    </<tr>
                `;
          $("#table-body-landingpage").append(tableData);
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
            sessionStorage.clear();
            window.location = "/login";
          }, 1000);

          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
        } else if (err.status === 401) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(
            `<span><i class="far fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`
          );
          setTimeout(function () {
            sessionStorage.clear();
            window.location = "/401";
          }, 1000);

          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
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
      fileName: "LandingPageData",
    });
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
  $("#maxRows").hide();
}, 800);
