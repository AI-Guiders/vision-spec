module VisionGdlBridge.Program

open System
open System.IO
open System.Text.Json
open System.Text.Json.Serialization
open AIGuiders.Platform.Modeling.Gdl.Authoring
open AIGuiders.Platform.Modeling.Gdl.Parse.Catalog
open AIGuiders.Platform.Modeling.Gdl.Parse.Deck

[<CLIMutable>]
type JsonDiagnostic = { code: string; message: string; line: int }

[<CLIMutable>]
type JsonCatalog =
    { id: string
      defaults: Map<string, string>
      commands: Map<string, string> list
      phrases: Map<string, string> list
      bindings: Map<string, string> list
      helps: Map<string, string> list
      diagnostics: JsonDiagnostic list }

[<CLIMutable>]
type JsonDeckPreset =
    { name: string
      topology: string
      forward: string list
      mfdSlots: string list
      eicas: string }

[<CLIMutable>]
type JsonDeck = { id: string; presets: JsonDeckPreset list; diagnostics: JsonDiagnostic list }

let private jsonOptions =
    let o = JsonSerializerOptions(WriteIndented = false)
    o.DefaultIgnoreCondition <- JsonIgnoreCondition.WhenWritingNull
    o

let private diag (d: AuthoringDiagnostic) =
    { code = string d.Code
      message = d.Message
      line = d.Line }

let private defaultsMap (d: CatalogDefaults) =
    [ yield! Option.toList (d.VariableKind |> Option.map (fun v -> "variable.kind", v))
      yield! Option.toList (d.CommandScope |> Option.map (fun v -> "command.scope", v))
      if not (List.isEmpty d.CommandSurfaces) then
          yield "command.surfaces", String.Join(", ", d.CommandSurfaces)
      yield! Option.toList (d.GrammarKeyboardBinding |> Option.map (fun v -> "grammar.keyboard.binding", v))
      yield! Option.toList (d.GrammarKeyboardMelody |> Option.map (fun v -> "grammar.keyboard.melody", v))
      yield! Option.toList (d.BindingChordRoot |> Option.map (fun v -> "binding.chord-root", v))
      yield! Option.toList (d.CommandFlavor |> Option.map (fun v -> "command.flavor", v)) ]
    |> Map.ofList

let private rowMap pairs = pairs |> Map.ofList

let private catalogToJson (doc: CatalogDocument) =
    { id = doc.Planet
      defaults = defaultsMap doc.Defaults
      commands = doc.Commands |> List.map (fun r -> Map.add "command" r.Command r.Columns)
      phrases = doc.Phrases |> List.map (fun p -> rowMap [ "name", p.Name; "phrase", p.Phrase ])
      bindings =
        doc.Bindings
        |> List.map (fun b ->
            rowMap
                [ "gesture", b.Gesture
                  "command", b.Command
                  "role", defaultArg b.Role "" ])
      helps =
        doc.Helps
        |> List.map (fun h -> rowMap [ "target", h.Target; "field", h.Field; "text", h.Text ])
      diagnostics = [] }

let private deckToJson (doc: DeckDocument) =
    { id = doc.Planet
      presets =
        doc.Presets
        |> List.map (fun p ->
            { name = p.Name
              topology =
                p.Topology
                |> Option.map (fun t -> t.SourceWire)
                |> Option.defaultValue ""
              forward =
                p.ForwardZoneId
                |> Option.map (fun z -> [ z ])
                |> Option.defaultValue []
              mfdSlots = p.MfdZoneIds
              eicas = defaultArg p.EicasPolicy "" })
      diagnostics = [] }

let parseCatalog (text: string) =
    let result = CatalogParser.parse text
    let diagnostics = result.Diagnostics |> List.map diag

    match result.Document with
    | None ->
        { id = ""
          defaults = Map.empty
          commands = []
          phrases = []
          bindings = []
          helps = []
          diagnostics = diagnostics }
    | Some doc ->
        let json = catalogToJson doc
        { json with diagnostics = diagnostics }

let parseDeck (text: string) =
    let result = DeckParser.parse text None
    let diagnostics = result.Diagnostics |> List.map diag

    match result.Document with
    | None -> { id = ""; presets = []; diagnostics = diagnostics }
    | Some doc ->
        let json = deckToJson doc
        { json with diagnostics = diagnostics }

[<EntryPoint>]
let main argv =
    try
        if argv.Length < 1 then
            eprintfn "usage: VisionGdlBridge catalog|deck  (GDL text on stdin)"
            2
        else
            let text = stdin.ReadToEnd()

            match argv.[0].ToLowerInvariant() with
            | "catalog" ->
                let payload = parseCatalog text
                printfn "%s" (JsonSerializer.Serialize(payload, jsonOptions))

                if List.isEmpty payload.diagnostics then 0 else 1
            | "deck" ->
                let payload = parseDeck text
                printfn "%s" (JsonSerializer.Serialize(payload, jsonOptions))

                if List.isEmpty payload.diagnostics then 0 else 1
            | other ->
                eprintfn "unknown kind `%s`" other
                2
    with ex ->
        eprintfn "%s" ex.Message
        3
