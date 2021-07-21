(function($) {
    $('.js-filter-toggle').on('click',function (){
        event.preventDefault();
        $('.fdrop').slideToggle(200);
    });

    $('.js-filter-close').on('click',function (){
        event.preventDefault();
        $('.fdrop').slideUp(200);
    });

    let fselects = $(".fdrop__select");

    fselects.each(function (){
        let elemId = $(this).attr('id');
        let mySelect = new vanillaSelectBox('#'+elemId,{
            placeHolder: "Выбрать",
            disableSelectAll: true,
            translations : { "all": "Все", "items": "Выбрано","selectAll":"Выбрать все","clearAll":"Снять все"}
        });
    });

    let priceSlider = document.getElementById('priceSlider');
    let minPrice = parseInt(priceSlider.dataset.min)
    let maxPrice = parseInt(priceSlider.dataset.max)

    noUiSlider.create(priceSlider, {
        start: [minPrice, maxPrice],
        connect: true,
        step: 1,
        range: {
            'min': minPrice,
            'max': maxPrice
        }
    });


    let inputMin = document.getElementById('min-price');
    let inputMax = document.getElementById('max-price');

    priceSlider.noUiSlider.on('update', function (values, handle) {
        var value = values[handle];
        if (handle) {
            inputMax.value = Math.round(value);
        } else {
            inputMin.value = Math.round(value);
        }
    });

    $('#min-price').on('cnahge keyup paste',function (){
        if ($(this).val() < minPrice) $(this).val(minPrice);
        if ($(this).val() > maxPrice) $(this).val(maxPrice);
        priceSlider.noUiSlider.set([$(this).val(), null]);
    });
    $('#max-price').on('cnahge keyup paste',function (){
        if ($(this).val() < minPrice) $(this).val(minPrice);
        if ($(this).val() > maxPrice) $(this).val(maxPrice);
        priceSlider.noUiSlider.set([null, $(this).val()]);
    });

}(jQuery));

