"""
Generator script for:
1. multi_object_instruments_multisheet.csv
2. multi_object_instruments_multisheet.xlsx

Contains 4 distinct weighing instruments / objects across 4 sheets with different parameters:
- Sheet 1: Demo Weighing Technologies DWT-300 (Class III, 300kg platform)
- Sheet 2: Mettler Toledo XPE-205DU (Class I, 220g analytical balance)
- Sheet 3: Apex Scales APX-3000-15K (Class III, 15000g bench scale)
- Sheet 4: KERN PCB 6000-1 (Class II, 6000g precision balance)
"""

import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OBJECTS = [
    {
        "sheet_name": "DWT-300_Platform",
        "title": "Object 1: Demo Weighing Technologies DWT-300 (Class III Industrial Platform)",
        "meta": [
            ("type_designation", "DWT-300 Heavy Duty Industrial Platform Scale"),
            ("model", "DWT-300"),
            ("manufacturer", "Demo Weighing Technologies"),
            ("applicant", "Demo Weighing Corp Ltd"),
            ("serial", "DWT300-24-00817"),
            ("accuracy_class", "III"),
            ("Max", 300),
            ("Min", 20),
            ("e", 0.1),
            ("d", 0.05),
            ("unit", "kg"),
            ("n", 3000),
            ("tare", -150),
            ("temp_range", "-10°C to +40°C"),
            ("power_supply", "230 V AC 50 Hz"),
            ("load_cell", "Class C3 500kg IP67 Shear Beam"),
            ("indicator", "DWT-Digital Stainless Steel IP68 Display"),
            ("software_version", "v3.1.2"),
            ("software_checksum", "0x7E3A9102"),
        ],
        "rows": [
            # test_code, point_name, load_L, indication_I, delta_L, extra_param, stage
            ("T1", "Zero_Initial", 0, 0, 0.05, "20C", "initial"),
            ("T1", "Min_20kg", 20, 20.0, 0.05, "20C", "initial"),
            ("T1", "500e_50kg", 50, 50.0, 0.05, "20C", "initial"),
            ("T1", "1000e_100kg", 100, 100.0, 0.05, "20C", "initial"),
            ("T1", "2000e_200kg", 200, 200.05, 0.05, "20C", "initial"),
            ("T1", "Max_300kg", 300, 300.05, 0.05, "20C", "initial"),
            ("T1", "Dec_200kg", 200, 200.0, 0.05, "20C", "initial"),
            ("T1", "Dec_100kg", 100, 100.0, 0.05, "20C", "initial"),
            ("T1", "Dec_50kg", 50, 50.0, 0.05, "20C", "initial"),
            ("T1", "Dec_20kg", 20, 20.0, 0.05, "20C", "initial"),
            ("T1", "Zero_Return", 0, 0, 0.05, "20C", "initial"),
            ("T2", "Temp_20C_Zero", 0, 0, 0.05, "20C", "initial"),
            ("T2", "Temp_40C_Zero", 0, 0.02, 0.05, "40C", "initial"),
            ("T2", "Temp_minus10C_Zero", 0, -0.03, 0.05, "-10C", "initial"),
            ("T2", "Temp_5C_Zero", 0, 0.01, 0.05, "5C", "initial"),
            ("T2", "Temp_20C_Final", 0, 0.0, 0.05, "20C", "initial"),
            ("T3.1", "Center_Pos1", 100, 100.0, 0.05, "Center", "initial"),
            ("T3.1", "FrontLeft_Pos2", 100, 100.05, 0.05, "Front-Left", "initial"),
            ("T3.1", "BackLeft_Pos3", 100, 100.05, 0.05, "Back-Left", "initial"),
            ("T3.1", "BackRight_Pos4", 100, 100.0, 0.05, "Back-Right", "initial"),
            ("T3.1", "FrontRight_Pos5", 100, 99.95, 0.05, "Front-Right", "initial"),
            ("T4.1.1", "Discrim_Min_20kg", 20, 20.0, 0.01, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Half_150kg", 150, 150.0, 0.01, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Max_300kg", 300, 300.0, 0.01, "1.4d", "initial"),
            ("T5", "Repeat_150kg_R1", 150, 150.0, 0.05, "Run1", "initial"),
            ("T5", "Repeat_150kg_R2", 150, 150.0, 0.05, "Run2", "initial"),
            ("T5", "Repeat_150kg_R3", 150, 150.05, 0.05, "Run3", "initial"),
            ("T5", "Repeat_300kg_R1", 300, 300.0, 0.05, "Run1", "initial"),
            ("T5", "Repeat_300kg_R2", 300, 300.05, 0.05, "Run2", "initial"),
            ("T5", "Repeat_300kg_R3", 300, 300.0, 0.05, "Run3", "initial"),
            ("T6.1", "ZeroReturn_0min", 0, 0, 0.05, "0min", "initial"),
            ("T6.1", "ZeroReturn_30min", 0, 0.02, 0.05, "30min", "initial"),
            ("T6.2", "Creep_0min", 300, 300.0, 0.05, "0min", "initial"),
            ("T6.2", "Creep_30min", 300, 300.05, 0.05, "30min", "initial"),
            ("T7", "Equilibrium_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T7", "Equilibrium_Load", 100, 100.0, 0.05, "Load", "initial"),
            ("T8", "Tilting_Zero", 0, 0, 0.05, "Tilt0", "initial"),
            ("T8", "Tilting_Load", 100, 100.05, 0.05, "Tilt1", "initial"),
            ("T9", "Tare_Zero", 0, 0, 0.05, "Tare0", "initial"),
            ("T9", "Tare_Load100k", 100, 100.0, 0.05, "Tare100k", "initial"),
            ("T10", "Warmup_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T10", "Warmup_Max", 300, 300.05, 0.05, "Max", "initial"),
            ("T11", "Voltage_Nominal", 100, 100.0, 0.05, "230V", "initial"),
            ("T11", "Voltage_Low", 100, 100.0, 0.05, "187V", "initial"),
            ("T11", "Voltage_High", 100, 100.05, 0.05, "253V", "initial"),
            ("T12.1", "Disturbance_BurstPos", 100, 100.0, 0.05, "1kV_Pos", "initial"),
            ("T12.1", "Disturbance_BurstNeg", 100, 100.05, 0.05, "1kV_Neg", "initial"),
            ("T13a", "DampHeat_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T13a", "DampHeat_100k", 100, 100.05, 0.05, "Load100k", "initial"),
            ("T14", "Span_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T14", "Span_300k", 300, 300.05, 0.05, "Span300k", "initial"),
            ("T15", "Endurance_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T15", "Endurance_150k", 150, 150.05, 0.05, "100k_cycles", "initial"),
        ]
    },
    {
        "sheet_name": "METTLER_XPE205DU",
        "title": "Object 2: Mettler Toledo XPE-205DU (Class I Analytical Micro-Balance)",
        "meta": [
            ("type_designation", "XPE-205DU Micro-Analytical Semi-Micro Balance"),
            ("model", "XPE-205DU"),
            ("manufacturer", "Mettler Toledo AG"),
            ("applicant", "Pharma Analytical Labs Switzerland"),
            ("serial", "MT-XPE-2024-9912"),
            ("accuracy_class", "I"),
            ("Max", 220),
            ("Min", 0.01),
            ("e", 0.001),
            ("d", 0.0001),
            ("unit", "g"),
            ("n", 220000),
            ("tare", -220),
            ("temp_range", "+10°C to +30°C"),
            ("power_supply", "100-240 V AC 50/60 Hz"),
            ("load_cell", "High-Precision Electromagnetic Force Restoration (EMFR) Cell"),
            ("indicator", "Touchscreen Color Graphic Terminal with Draft Shield"),
            ("software_version", "v4.8.0"),
            ("software_checksum", "0xFA88C31D"),
        ],
        "rows": [
            ("T1", "Zero_Initial", 0, 0, 0.0005, "20C", "initial"),
            ("T1", "Min_0.01g", 0.01, 0.0100, 0.0005, "20C", "initial"),
            ("T1", "50000e_50g", 50, 50.0000, 0.0005, "20C", "initial"),
            ("T1", "100000e_100g", 100, 100.0002, 0.0005, "20C", "initial"),
            ("T1", "150000e_150g", 150, 150.0005, 0.0005, "20C", "initial"),
            ("T1", "Max_220g", 220, 220.0008, 0.0005, "20C", "initial"),
            ("T1", "Dec_150g", 150, 150.0004, 0.0005, "20C", "initial"),
            ("T1", "Dec_100g", 100, 100.0001, 0.0005, "20C", "initial"),
            ("T1", "Dec_50g", 50, 50.0000, 0.0005, "20C", "initial"),
            ("T1", "Dec_0.01g", 0.01, 0.0100, 0.0005, "20C", "initial"),
            ("T1", "Zero_Return", 0, 0, 0.0005, "20C", "initial"),
            ("T2", "Temp_20C_Zero", 0, 0, 0.0005, "20C", "initial"),
            ("T2", "Temp_30C_Zero", 0, 0.0002, 0.0005, "30C", "initial"),
            ("T2", "Temp_10C_Zero", 0, -0.0003, 0.0005, "10C", "initial"),
            ("T2", "Temp_20C_Final", 0, 0.0, 0.0005, "20C", "initial"),
            ("T3.1", "Center_Pos1", 70, 70.0000, 0.0005, "Center", "initial"),
            ("T3.1", "FrontLeft_Pos2", 70, 70.0002, 0.0005, "Front-Left", "initial"),
            ("T3.1", "BackLeft_Pos3", 70, 70.0001, 0.0005, "Back-Left", "initial"),
            ("T3.1", "BackRight_Pos4", 70, 70.0000, 0.0005, "Back-Right", "initial"),
            ("T3.1", "FrontRight_Pos5", 70, 69.9998, 0.0005, "Front-Right", "initial"),
            ("T4.1.1", "Discrim_Min_0.01g", 0.01, 0.0100, 0.0001, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Half_100g", 100, 100.0000, 0.0001, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Max_220g", 220, 220.0000, 0.0001, "1.4d", "initial"),
            ("T5", "Repeat_100g_R1", 100, 100.0000, 0.0005, "Run1", "initial"),
            ("T5", "Repeat_100g_R2", 100, 100.0001, 0.0005, "Run2", "initial"),
            ("T5", "Repeat_100g_R3", 100, 100.0000, 0.0005, "Run3", "initial"),
            ("T5", "Repeat_220g_R1", 220, 220.0000, 0.0005, "Run1", "initial"),
            ("T5", "Repeat_220g_R2", 220, 220.0005, 0.0005, "Run2", "initial"),
            ("T5", "Repeat_220g_R3", 220, 220.0002, 0.0005, "Run3", "initial"),
            ("T6.1", "ZeroReturn_0min", 0, 0, 0.0005, "0min", "initial"),
            ("T6.1", "ZeroReturn_30min", 0, 0.0001, 0.0005, "30min", "initial"),
            ("T6.2", "Creep_0min", 220, 220.0, 0.0005, "0min", "initial"),
            ("T6.2", "Creep_30min", 220, 220.0004, 0.0005, "30min", "initial"),
            ("T7", "Equilibrium_Zero", 0, 0, 0.0005, "Zero", "initial"),
            ("T7", "Equilibrium_Load", 50, 50.0000, 0.0005, "Load", "initial"),
            ("T8", "Tilting_Zero", 0, 0, 0.0005, "Tilt0", "initial"),
            ("T8", "Tilting_Load", 50, 50.0002, 0.0005, "Tilt1", "initial"),
            ("T9", "Tare_Zero", 0, 0, 0.0005, "Tare0", "initial"),
            ("T9", "Tare_Load50g", 50, 50.0000, 0.0005, "Tare50g", "initial"),
            ("T10", "Warmup_Zero", 0, 0, 0.0005, "Zero", "initial"),
            ("T10", "Warmup_Max", 220, 220.0002, 0.0005, "Max", "initial"),
            ("T11", "Voltage_Nominal", 50, 50.0000, 0.0005, "230V", "initial"),
            ("T11", "Voltage_Low", 50, 50.0000, 0.0005, "187V", "initial"),
            ("T11", "Voltage_High", 50, 50.0001, 0.0005, "253V", "initial"),
            ("T14", "Span_Zero", 0, 0, 0.0005, "Zero", "initial"),
            ("T14", "Span_220g", 220, 220.0005, 0.0005, "Span220g", "initial"),
        ]
    },
    {
        "sheet_name": "APX-3000_BenchScale",
        "title": "Object 3: Apex Scales APX-3000-15K (Class III Industrial Bench Scale)",
        "meta": [
            ("type_designation", "APX-3000 Series Industrial Bench Scale"),
            ("model", "APX-3000-15K"),
            ("manufacturer", "Apex Scales & Systems Co., Ltd"),
            ("applicant", "Apex Metrology Global Corp"),
            ("serial", "APX15K-2024-4410"),
            ("accuracy_class", "III"),
            ("Max", 15000),
            ("Min", 100),
            ("e", 5),
            ("d", 1),
            ("unit", "g"),
            ("n", 3000),
            ("tare", -5000),
            ("temp_range", "-10°C to +40°C"),
            ("power_supply", "230 V AC 50 Hz"),
            ("load_cell", "Class C3 20kg Aluminum Single Point"),
            ("indicator", "Apex IP65 Backlit LCD Terminal"),
            ("software_version", "v2.4.1"),
            ("software_checksum", "0x9B4E21F8"),
        ],
        "rows": [
            ("T1", "Zero_Initial", 0, 0, 2.5, "20C", "initial"),
            ("T1", "Min_100g", 100, 100, 2.5, "20C", "initial"),
            ("T1", "500e_2500g", 2500, 2500, 2.5, "20C", "initial"),
            ("T1", "1000e_5000g", 5000, 5001, 2.5, "20C", "initial"),
            ("T1", "2000e_10000g", 10000, 10001, 2.5, "20C", "initial"),
            ("T1", "Max_15000g", 15000, 15002, 2.5, "20C", "initial"),
            ("T1", "Dec_10000g", 10000, 10001, 2.5, "20C", "initial"),
            ("T1", "Dec_5000g", 5000, 5001, 2.5, "20C", "initial"),
            ("T1", "Dec_2500g", 2500, 2500, 2.5, "20C", "initial"),
            ("T1", "Dec_100g", 100, 100, 2.5, "20C", "initial"),
            ("T1", "Zero_Return", 0, 0, 2.5, "20C", "initial"),
            ("T2", "Temp_20C", 0, 0, 2.5, "20C", "initial"),
            ("T2", "Temp_40C", 0, 0.8, 2.5, "40C", "initial"),
            ("T2", "Temp_minus10C", 0, -0.6, 2.5, "-10C", "initial"),
            ("T2", "Temp_5C", 0, 0.2, 2.5, "5C", "initial"),
            ("T2", "Temp_20C_final", 0, 0.1, 2.5, "20C", "initial"),
            ("T3.1", "Center_1", 5000, 5000, 2.5, "Center", "initial"),
            ("T3.1", "FrontLeft_2", 5000, 5001, 2.5, "Front-Left", "initial"),
            ("T3.1", "BackLeft_3", 5000, 5001, 2.5, "Back-Left", "initial"),
            ("T3.1", "BackRight_4", 5000, 5000, 2.5, "Back-Right", "initial"),
            ("T3.1", "FrontRight_5", 5000, 4999, 2.5, "Front-Right", "initial"),
            ("T4.1.1", "Discrim_Min", 100, 100, 0.5, "1.4", "initial"),
            ("T4.1.1", "Discrim_HalfMax", 7500, 7500, 0.5, "1.4", "initial"),
            ("T4.1.1", "Discrim_Max", 15000, 15000, 0.5, "1.4", "initial"),
            ("T5", "Repeat_HalfMax_1", 7500, 7500, 2.5, "Run1", "initial"),
            ("T5", "Repeat_HalfMax_2", 7500, 7500, 2.5, "Run2", "initial"),
            ("T5", "Repeat_HalfMax_3", 7500, 7500, 2.5, "Run3", "initial"),
            ("T5", "Repeat_Max_1", 15000, 15000, 2.5, "Run1", "initial"),
            ("T5", "Repeat_Max_2", 15000, 15000, 2.5, "Run2", "initial"),
            ("T5", "Repeat_Max_3", 15000, 15001, 2.5, "Run3", "initial"),
            ("T6.1", "ZeroReturn_0min", 0, 0, 2.5, "0min", "initial"),
            ("T6.1", "ZeroReturn_30min", 0, 1, 2.5, "30min", "initial"),
            ("T6.2", "Creep_0min", 15000, 15000, 2.5, "0min", "initial"),
            ("T6.2", "Creep_30min", 15000, 15001, 2.5, "30min", "initial"),
            ("T7", "Equilibrium_Zero", 0, 0, 2.5, "Zero", "initial"),
            ("T7", "Equilibrium_Load", 5000, 5000, 2.5, "Load", "initial"),
            ("T8", "Tilting_Zero", 0, 0, 2.5, "Tilt0", "initial"),
            ("T8", "Tilting_Load", 5000, 5001, 2.5, "Tilt1", "initial"),
            ("T9", "Tare_Zero", 0, 0, 2.5, "Tare0", "initial"),
            ("T9", "Tare_Load5k", 5000, 5000, 2.5, "Tare5k", "initial"),
            ("T10", "Warmup_Zero", 0, 0, 2.5, "Zero", "initial"),
            ("T10", "Warmup_Max", 15000, 15001, 2.5, "Max", "initial"),
            ("T11", "Voltage_Nominal", 5000, 5000, 2.5, "230V", "initial"),
            ("T11", "Voltage_Low", 5000, 5000, 2.5, "187V", "initial"),
            ("T11", "Voltage_High", 5000, 5000, 2.5, "253V", "initial"),
            ("T12.1", "Disturbance_BurstPos", 5000, 5000, 2.5, "1kV_Pos", "initial"),
            ("T12.1", "Disturbance_BurstNeg", 5000, 5001, 2.5, "1kV_Neg", "initial"),
            ("T13a", "DampHeat_Zero", 0, 0, 2.5, "Zero", "initial"),
            ("T13a", "DampHeat_5k", 5000, 5001, 2.5, "Load5k", "initial"),
            ("T14", "Span_Zero", 0, 0, 2.5, "Zero", "initial"),
            ("T14", "Span_15k", 15000, 15001, 2.5, "Span15k", "initial"),
            ("T15", "Endurance_Zero", 0, 0, 2.5, "Zero", "initial"),
            ("T15", "Endurance_7k5", 7500, 7501, 2.5, "100k_cycles", "initial"),
        ]
    },
    {
        "sheet_name": "KERN_PCB6000",
        "title": "Object 4: KERN PCB 6000-1 (Class II Laboratory Precision Balance)",
        "meta": [
            ("type_designation", "PCB 6000-1 Precision Top-Pan Balance"),
            ("model", "PCB 6000-1"),
            ("manufacturer", "KERN & SOHN GmbH"),
            ("applicant", "Kern Precision Metrology Germany"),
            ("serial", "KERN-PCB-88741"),
            ("accuracy_class", "II"),
            ("Max", 6000),
            ("Min", 5),
            ("e", 0.1),
            ("d", 0.1),
            ("unit", "g"),
            ("n", 60000),
            ("tare", -6000),
            ("temp_range", "+15°C to +35°C"),
            ("power_supply", "12 V DC / 230 V Adapter"),
            ("load_cell", "Class C2 High Precision Strain Gauge"),
            ("indicator", "Backlit LCD with Bar Graph Capacity Display"),
            ("software_version", "v1.9.4"),
            ("software_checksum", "0x3D72B9A1"),
        ],
        "rows": [
            ("T1", "Zero_Initial", 0, 0, 0.05, "20C", "initial"),
            ("T1", "Min_5g", 5, 5.0, 0.05, "20C", "initial"),
            ("T1", "5000e_500g", 500, 500.0, 0.05, "20C", "initial"),
            ("T1", "20000e_2000g", 2000, 2000.0, 0.05, "20C", "initial"),
            ("T1", "40000e_4000g", 4000, 4000.1, 0.05, "20C", "initial"),
            ("T1", "Max_6000g", 6000, 6000.1, 0.05, "20C", "initial"),
            ("T1", "Dec_4000g", 4000, 4000.0, 0.05, "20C", "initial"),
            ("T1", "Dec_2000g", 2000, 2000.0, 0.05, "20C", "initial"),
            ("T1", "Dec_500g", 500, 500.0, 0.05, "20C", "initial"),
            ("T1", "Dec_5g", 5, 5.0, 0.05, "20C", "initial"),
            ("T1", "Zero_Return", 0, 0, 0.05, "20C", "initial"),
            ("T2", "Temp_20C_Zero", 0, 0, 0.05, "20C", "initial"),
            ("T2", "Temp_35C_Zero", 0, 0.05, 0.05, "35C", "initial"),
            ("T2", "Temp_15C_Zero", 0, -0.04, 0.05, "15C", "initial"),
            ("T2", "Temp_20C_Final", 0, 0.0, 0.05, "20C", "initial"),
            ("T3.1", "Center_Pos1", 2000, 2000.0, 0.05, "Center", "initial"),
            ("T3.1", "FrontLeft_Pos2", 2000, 2000.1, 0.05, "Front-Left", "initial"),
            ("T3.1", "BackLeft_Pos3", 2000, 2000.1, 0.05, "Back-Left", "initial"),
            ("T3.1", "BackRight_Pos4", 2000, 2000.0, 0.05, "Back-Right", "initial"),
            ("T3.1", "FrontRight_Pos5", 2000, 1999.9, 0.05, "Front-Right", "initial"),
            ("T4.1.1", "Discrim_Min_5g", 5, 5.0, 0.01, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Half_3000g", 3000, 3000.0, 0.01, "1.4d", "initial"),
            ("T4.1.1", "Discrim_Max_6000g", 6000, 6000.0, 0.01, "1.4d", "initial"),
            ("T5", "Repeat_3000g_R1", 3000, 3000.0, 0.05, "Run1", "initial"),
            ("T5", "Repeat_3000g_R2", 3000, 3000.1, 0.05, "Run2", "initial"),
            ("T5", "Repeat_3000g_R3", 3000, 3000.0, 0.05, "Run3", "initial"),
            ("T5", "Repeat_6000g_R1", 6000, 6000.0, 0.05, "Run1", "initial"),
            ("T5", "Repeat_6000g_R2", 6000, 6000.1, 0.05, "Run2", "initial"),
            ("T5", "Repeat_6000g_R3", 6000, 6000.0, 0.05, "Run3", "initial"),
            ("T6.1", "ZeroReturn_0min", 0, 0, 0.05, "0min", "initial"),
            ("T6.1", "ZeroReturn_30min", 0, 0.03, 0.05, "30min", "initial"),
            ("T6.2", "Creep_0min", 6000, 6000.0, 0.05, "0min", "initial"),
            ("T6.2", "Creep_30min", 6000, 6000.1, 0.05, "30min", "initial"),
            ("T7", "Equilibrium_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T7", "Equilibrium_Load", 2000, 2000.0, 0.05, "Load", "initial"),
            ("T8", "Tilting_Zero", 0, 0, 0.05, "Tilt0", "initial"),
            ("T8", "Tilting_Load", 2000, 2000.1, 0.05, "Tilt1", "initial"),
            ("T9", "Tare_Zero", 0, 0, 0.05, "Tare0", "initial"),
            ("T9", "Tare_Load2000g", 2000, 2000.0, 0.05, "Tare2000g", "initial"),
            ("T10", "Warmup_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T10", "Warmup_Max", 6000, 6000.1, 0.05, "Max", "initial"),
            ("T11", "Voltage_Nominal", 2000, 2000.0, 0.05, "12V", "initial"),
            ("T11", "Voltage_Low", 2000, 2000.0, 0.05, "10.2V", "initial"),
            ("T11", "Voltage_High", 2000, 2000.1, 0.05, "13.8V", "initial"),
            ("T14", "Span_Zero", 0, 0, 0.05, "Zero", "initial"),
            ("T14", "Span_6000g", 6000, 6000.1, 0.05, "Span6000g", "initial"),
        ]
    }
]

def build_csv():
    lines = []
    lines.append("# ==========================================================================")
    lines.append("# METROCERT BULK OIML R 76-2 MULTI-OBJECT MULTI-SHEET DATASET")
    lines.append("# Contains 4 Distinct Measuring Instruments / Objects with Full Test Series")
    lines.append("# ==========================================================================")
    lines.append("")

    for idx, obj in enumerate(OBJECTS, start=1):
        lines.append(f"=== SHEET: {obj['sheet_name']} ===")
        lines.append(f"# {obj['title']}")
        lines.append("# Format: META,FieldName,Value")
        for k, v in obj["meta"]:
            lines.append(f"META,{k},{v}")
        lines.append("")
        lines.append("# TEST OBSERVATION DATA")
        lines.append("# Format: test_code,point_name,load_L,indication_I,delta_L,extra_param,stage")
        for row in obj["rows"]:
            lines.append(",".join(str(x) for x in row))
        lines.append("")

    return "\n".join(lines)


def build_xlsx(filename):
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    meta_key_font = Font(name="Calibri", size=10, bold=True, color="334155")
    meta_key_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    title_font = Font(name="Calibri", size=13, bold=True, color="0F172A")
    title_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin', color="CBD5E1"),
        right=Side(style='thin', color="CBD5E1"),
        top=Side(style='thin', color="CBD5E1"),
        bottom=Side(style='thin', color="CBD5E1")
    )

    for obj in OBJECTS:
        ws = wb.create_sheet(title=obj["sheet_name"])
        
        # Title row
        ws.merge_cells("A1:G1")
        cell_a1 = ws["A1"]
        cell_a1.value = f"OIML R 76-2 Test Observation Data - {obj['title']}"
        cell_a1.font = title_font
        cell_a1.fill = title_fill
        cell_a1.alignment = Alignment(vertical="center", indent=1)
        ws.row_dimensions[1].height = 28

        # Metadata Section Header
        ws.merge_cells("A3:B3")
        m_head = ws["A3"]
        m_head.value = "INSTRUMENT SPECIFICATIONS (METADATA)"
        m_head.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        m_head.fill = PatternFill(start_color="475569", end_color="475569", fill_type="solid")
        m_head.alignment = Alignment(vertical="center", indent=1)

        row_idx = 4
        for k, v in obj["meta"]:
            k_cell = ws.cell(row=row_idx, column=1, value=k)
            k_cell.font = meta_key_font
            k_cell.fill = meta_key_fill
            k_cell.border = thin_border
            
            v_cell = ws.cell(row=row_idx, column=2, value=v)
            v_cell.font = Font(name="Calibri", size=10, color="0F172A")
            v_cell.border = thin_border
            row_idx += 1

        # Observation Data Table
        row_idx += 2
        ws.merge_cells(f"A{row_idx}:G{row_idx}")
        obs_head = ws[f"A{row_idx}"]
        obs_head.value = "OIML TEST OBSERVATION MEASUREMENTS"
        obs_head.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        obs_head.fill = PatternFill(start_color="475569", end_color="475569", fill_type="solid")
        obs_head.alignment = Alignment(vertical="center", indent=1)
        
        row_idx += 1
        headers = ["test_code", "point_name", "load_L", "indication_I", "delta_L", "extra_param", "stage"]
        for col_idx, h in enumerate(headers, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center" if col_idx != 2 else "left", vertical="center")
            cell.border = thin_border
        ws.row_dimensions[row_idx].height = 22

        for data_row in obj["rows"]:
            row_idx += 1
            for col_idx, val in enumerate(data_row, start=1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = Font(name="Calibri", size=10)
                cell.border = thin_border
                if col_idx in (3, 4, 5):
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                elif col_idx in (1, 6, 7):
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")

        # Auto-fit column widths
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or '')
                if len(val_str) > max_len and not cell.coordinate in ws.merged_cells:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(filename)
    print(f"XLSX saved successfully to: {filename}")


if __name__ == "__main__":
    csv_text = build_csv()
    
    # Save CSV to root and public directories
    csv_paths = [
        os.path.join(os.getcwd(), "multi_object_instruments_multisheet.csv"),
        os.path.join(os.getcwd(), "app", "public", "multi_object_instruments_multisheet.csv"),
    ]
    for p in csv_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(csv_text)
        print(f"CSV saved to: {p}")

    # Save XLSX to root and public directories
    xlsx_paths = [
        os.path.join(os.getcwd(), "multi_object_instruments_multisheet.xlsx"),
        os.path.join(os.getcwd(), "app", "public", "multi_object_instruments_multisheet.xlsx"),
    ]
    for p in xlsx_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        build_xlsx(p)
