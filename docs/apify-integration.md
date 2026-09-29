# Apify / Meta Ads Library — V1

## Fluxo

`palavra-chave → URL Meta Ads Library → Apify Actor → dataset → normalização → agrupamento → oferta → snapshot`.

O endpoint `POST /api/mining` é a única camada que lê `APIFY_API_TOKEN`. O browser envia somente a consulta e recebe ofertas agrupadas, nunca token, run input bruto ou dados sensíveis de configuração.

## Actor e limite inicial

O actor configurado é `curious_coder/facebook-ads-library-scraper`. O primeiro teste deve usar `fisioterapia`, `BR`, `active`, limite `20`. A interface não fixa esse termo: qualquer termo passa pela mesma validação server-side.

O actor informa que `limitPerSource` pode exceder o limite em até 30 resultados. O Sinal Pulse envia `count` e `limitPerSource`, ambos com o limite pedido, e limita novamente a leitura do dataset. Logo, a persistência V1 nunca processa mais itens que o limite solicitado.

## Agrupamento sem IA

Cada anúncio normalizado é agrupado pela combinação: `advertiser/page + domínio de destino + landing_page_url`.

Limitações conhecidas:

- URLs com UTM ou caminhos diferentes podem separar uma mesma oferta.
- Landing pages ausentes formam grupos menos confiáveis, pois caem em uma chave de fallback.
- Mesmo anunciante pode anunciar ofertas distintas no mesmo domínio; sem IA, a URL é a melhor separação disponível.
- O primeiro snapshot não calcula variação: `new_ads_since_previous_snapshot` e `removed_ads_since_previous_snapshot` permanecem `null` e o componente mostra `MOMENTUM · AGUARDANDO HISTÓRICO`.
