var stompClient = null;

function connect() {
    stompClient = Stomp.over(new WebSocket("ws://api.zigurs.com/stomp"));
    stompClient.debug = null;
    stompClient.connect(
    {}, // Anonymous connection
    function (frame) { // Connection successful
        stompClient.subscribe('/user/error', function (response) {
            alert("Server error: " + response.body)
        });
        stompClient.subscribe('/user/query', function (response) {
            handleIncoming(response.body);
        });
        stompClient.subscribe('/user/stats', function (response) {
            showStats(response.body);
        });
        sendStatsRequest();
    },
    function (error) { // Connection failure
        console.log("Connection unavailable: " + error);
    }
    );
}

function showStats(responseBody) {
    var response = JSON.parse(responseBody);
    $("#stats").html(response.items + " items and " + response.fragments + " fragments");
}

function sendQueryRequest(query) {
    stompClient.send("/query", {}, JSON.stringify(
            {'query': query, 'limit' : 10}
        )
    );
}

function sendStatsRequest() {
    stompClient.send("/stats", {}, JSON.stringify(
            {}
        )
    );
}

function showResults(serverResponse) {
    var response = JSON.parse(serverResponse);

    var summary = "";
    if (response.items.length > 0) {
        summary += "<ul>";
        for (i = 0; i < response.items.length; i++) {
            if (i % 2 == 1) {
                summary += "<li class='odd'>";
            } else {
                summary += "<li class='even'>";
            }

            summary += response.items[i].item;
            /* summary += " <span class=\"score\">(" + response.items[i].score.toFixed(2) + ")</span>" */
            summary += "</li>\n"
        }
        summary += "</ul>";

        $("#searchbox").attr('class', '');
    } else if ($("#searchbox").val().length != 0) {
        $("#searchbox").attr('class', 'empty');
    } else {
        $("#searchbox").attr('class', '');
    }

    $("#results").html(summary);
}

var pendingCount = 0;
var pendingRequest = null;

function requestQuery() {
    var currentQuery = $("#searchbox").val();

    if (pendingCount > 0) { // Something is already in the pipeline (1 or blocked)
        pendingRequest = currentQuery; // Store the last requested value
        pendingCount = 2; // Indicate that we have a blocked request pending
    } else {
        pendingCount = 1;
        sendQueryRequest(currentQuery);
    }
}

/*
 * Poor mans traffic control. Fire off any pending request
 * if one was stored while waiting for the previous one to return.
 */
function handleIncoming(body) {
    showResults(body);

    if (pendingCount == 2) {
        pendingCount = 1;
        sendQueryRequest(pendingRequest);
    } else {
        pendingCount = 0;
        pendingRequest = null;
    }
}

$(function () {
    connect();
    $("#searchbox").focus();
    $("#searchbox").on('change keyup paste', function () {
       requestQuery();
    });
});