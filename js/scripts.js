$(document).ready(function () {
    "use strict";

    var $window = $(window).on('resize', function () {
            centerModal();
        }),
        $document = $(document).ajaxStart(function () {
            // if (showSpinner)
                $searchSpinner.addClass('is-active').show();
            $btnSubmit.attr('disabled', true);
        }).ajaxError(function (event, jqxhr, settings, thrownError) {
            $searchSpinner.hide().removeClass('is-active');
            $btnSubmit.attr('disabled', false);
        }).ajaxStop(function () {
            $searchSpinner.hide().removeClass('is-active');
            $btnSubmit.attr('disabled', false);
        }),

        charcode_a = 97,
        charcode_z = 122,
        showSpinner = true,
        searching = false,
        timeoutID = null,
        lastTray = '',
        lastTouchedStartTime = new Date().getTime(),
        snackbarContainer = document.querySelector('#wfToast'),
        sidebarWidth = 240,
        backend = 0,
        backends = ["Go", "Node", "PHP", "Python"],

        $searchSpinner = $("#searchSpinner"),

        $title = $('.mdl-layout-title'),
        $resultsArea = $('#resultsArea'),
        $btnSubmit = $('#btnSubmit'),

        $defModal = $('#defModal').on('show.bs.modal', function () {
            centerModal();
        }),
        $defModalTitle = $('#defModalTitle', $defModal),
        $defModalBody = $('.modal-body', $defModal),

        $labelClear = $("#labelClear").click(function () {
            $tray.val('');
        }),

        $backend_switcher = $("input[name='backendoptions']").change(function () {
            backend = parseInt($(this).val());
            $title.text(backends[backend] + 'WordFinder');
            $resultsArea.text('');
            lastTray = '';
        }),

        $tray = $("#tray").keyup(function (e) {
            //event.preventDefault();
            clearTimeout(timeoutID);
            if (!searching) {
                timeoutID = setTimeout(
                    doSearch.bind(undefined, false), 250);
            }
        }),

        $formSearch = $("#formSearch").submit(function (event) {
            event.preventDefault();
            if (searching)
                return false;
            else
                doSearch(true);
        }),

        definitionSearch1 = $document.on('click', '#resultsArea .wordcontainer div', function (e) {
            showWordDefModal(this.innerHTML);
        }),
        definitionSearch2 = $document.on('touchstart', '#resultsArea .wordcontainer div', function (e) {
            lastTouchedStartTime = new Date().getTime();
        }).on('touchend', '#resultsArea .wordcontainer div', function (e) {
            var diff = new Date().getTime() - lastTouchedStartTime;
            if (diff > 350) {
                e.stopPropagation();
                e.preventDefault();
                showWordDefModal(this.innerHTML);
            }
        });

    function showWordDefModal(word) {
        $defModalTitle.text(word);
        showSpinner = false;
        $.ajax({
            type: 'GET',
            url: 'http://phpwordfinder.erictotten.info/define/' + word,
            dataType: 'html'
        }).done(function (data, textStatus, jqXHR) {
            $defModalBody.html(data);
            $defModal.modal('show');
            showSpinner = true;
        });
    }

    function validateInput($traytext) {
        var charcode = 0, i, j,
            result = {
                tray: '',
                letters_only: '',
                wild_count: 0,
                errmsg: ''
            };

        for (i = 0, j = $traytext.length; i < j; i++) {
            if ($traytext[i] == '?')
                result.wild_count++;
            else {
                charcode = $traytext.charCodeAt(i);
                if ((charcode >= charcode_a) && (charcode <= charcode_z))
                    result.letters_only += $traytext[i];
            }
        }

        result.tray = result.letters_only;
        for (i = 0; i < result.wild_count; i++)
            result.tray += '?';

        if (result.tray.length < 2)
            result.errmsg = 'You must enter at least two characters.';

        return result;
    }

    function centerModal() {
        var $dialog = $defModal.find('.modal-dialog'),
            winWidth = $window.width(),
            dWidth = $dialog.width();

        $dialog.css("margin-top", Math.max(0, ($window.height() - $dialog.height()) / 4));
        if (winWidth > 1024)
            $dialog.css("margin-left", (winWidth / 2) - (dWidth / 2) + sidebarWidth / 2);
        else if (winWidth > 767)
            $dialog.css("margin-left", (winWidth / 2) - (dWidth / 2));
        else
            $dialog.css("margin-left", $dialog.css("margin-right"));
    }

    function doSearch(findButtonClicked) {

        var startTime = new Date(),
            oInput = {},
            return_type = 'html',
            findurl = 'http://wordfinder.erictotten.info/find',
            $traytext = $tray.val().trim().toLowerCase();

        if (!findButtonClicked && $traytext.length < 2)
            return false;

        if ($traytext.length == 0) {
            $tray.val('');
            return false;
        }

        oInput = validateInput($traytext);
        $tray.val(oInput.tray);

        if (oInput.errmsg.length > 0) {
            snackbarContainer.MaterialSnackbar.showSnackbar({message: oInput.errmsg});
            return false;
        }

        if (lastTray == oInput.tray)
            return;

        if ( findButtonClicked ) {
            $resultsArea.text('');
            $tray.blur();
        }

        return_type = $('input[name=resultoptions]:checked').val();

        switch (backend) {
            case 0:
                findurl = 'http://gowordfinder.appspot.com/find';
                break;
            case 1:
                findurl = 'http://nodewordfinder.herokuapp.com/find';
                break;
            case 2:
                findurl = 'http://phpwordfinder.erictotten.info/find';
                break;
            case 3:
                findurl = 'http://pywordfinder.appspot.com/search';
                break;
        }

        searching = true;
        showSpinner = true;//findButtonClicked;
        lastTray = oInput.tray;
        $.ajax({
            type: 'GET',
            url: findurl,
            cache: false,
            data: {tray: oInput.letters_only, sm: 0, rt: return_type, wc: oInput.wild_count}
        }).done(function (data) {
            if (return_type == 'html') {
                $resultsArea.html(data);
                setTimeout(function () {
                    var endTime1 = new Date(),
                        timeDiff1 = (endTime1 - startTime) / 1000,
                        seconds1 = Math.round((timeDiff1 % 60) * 100) / 100;
                    $('#results_footer', $resultsArea).append('<br />Total time: ' + seconds1 + ' secs.');
                    searching = false;
                }, 1);
            } else {
                var wordlist, total = 0,
                    res = '<h5 id="resultsFor">Results for <span>' + oInput.tray + '</span></h5>';

                if (data.length == 0)
                    res += '<p class="noresults">No words found.</p>';

                for (var i = 0; i < data.length; i++) {
                    wordlist = data[i];
                    if (wordlist.length == 0)
                        continue;
                    res += '<p>' + wordlist[0].length + ' Letter Words</p><div class="wordcontainer">';
                    for (var j = 0, k = wordlist.length; j < k; j++) {
                        res += '<div>' + wordlist[j] + '</div>';
                        total++;
                    }
                    res += '</div>';
                }
                $resultsArea.html(res);
                setTimeout(function () {
                    var endTime2 = new Date(),
                        timeDiff2 = (endTime2 - startTime) / 1000,
                        seconds2 = Math.round((timeDiff2 % 60) * 100) / 100;
                    $resultsArea.append('<p id="results_footer">' + total + ' results in ' + seconds2 + ' secs.</p>');
                    searching = false;
                }, 1);
            }
        });
    }

    $searchSpinner.hide();
    $tray.focus();
});
