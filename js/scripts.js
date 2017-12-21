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
        isMobile = false,

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
           if (isMobile)
               return;
            clearTimeout(timeoutID);
            if (!searching) {
                timeoutID = setTimeout(
                    doSearch.bind(undefined, false), 500);
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
            url: 'https://phpwordfinder.erictotten.net/define/' + word,
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
            findurl = 'http://wordfinder.erictotten.net/find',
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
                findurl = 'https://phpwordfinder.erictotten.net/find';
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

    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;

});
